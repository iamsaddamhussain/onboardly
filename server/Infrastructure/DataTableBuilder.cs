using System.Linq.Expressions;
using Microsoft.EntityFrameworkCore;
using Onboardly.Server.Dtos;

namespace Onboardly.Server.Infrastructure;

// Query parameters every datatable endpoint accepts. Binds straight from the
// query string (?search=&sortBy=&sortDir=&page=&pageSize=), so a controller
// action can take `[FromQuery] DataTableRequest request`.
public record DataTableRequest(
    string? Search = null,
    string? SortBy = null,
    string? SortDir = null,
    int Page = 1,
    int PageSize = 10)
{
    public bool Descending => string.Equals(SortDir, "desc", StringComparison.OrdinalIgnoreCase);
}

// Fluent helper that turns an IQueryable into a paged, searched and sorted
// result for our SPA datatable. Configure searchable columns and named sorts,
// then call ToPagedResultAsync with a projection to the row DTO.
public class DataTableBuilder<T>
{
    private readonly IQueryable<T> _query;
    private readonly DataTableRequest _request;
    private readonly Dictionary<string, Func<IQueryable<T>, bool, IOrderedQueryable<T>>> _sorts =
        new(StringComparer.OrdinalIgnoreCase);
    private Func<IQueryable<T>, IOrderedQueryable<T>>? _defaultSort;
    private Func<string, Expression<Func<T, bool>>>? _search;

    public DataTableBuilder(IQueryable<T> query, DataTableRequest request)
    {
        _query = query;
        _request = request;
    }

    // Define how a quick-search term filters rows (e.g. ILike across columns).
    public DataTableBuilder<T> Searchable(Func<string, Expression<Func<T, bool>>> predicate)
    {
        _search = predicate;
        return this;
    }

    // Register a named sort. The bool argument is true when descending.
    public DataTableBuilder<T> Sortable(string key, Func<IQueryable<T>, bool, IOrderedQueryable<T>> apply)
    {
        _sorts[key] = apply;
        return this;
    }

    // The ordering applied when no (or an unknown) sortBy is supplied.
    public DataTableBuilder<T> DefaultSort(Func<IQueryable<T>, IOrderedQueryable<T>> apply)
    {
        _defaultSort = apply;
        return this;
    }

    public async Task<PagedResult<TDto>> ToPagedResultAsync<TDto>(Expression<Func<T, TDto>> selector)
    {
        var page = _request.Page < 1 ? 1 : _request.Page;
        var pageSize = _request.PageSize is < 1 or > 100 ? 10 : _request.PageSize;

        var query = _query;

        // Quick-search filter.
        if (_search is not null && !string.IsNullOrWhiteSpace(_request.Search))
            query = query.Where(_search(_request.Search.Trim()));

        // Count the full matching set before paging.
        var totalCount = await query.CountAsync();

        // Sorting: a registered sort wins, otherwise fall back to the default.
        if (_request.SortBy is not null && _sorts.TryGetValue(_request.SortBy, out var apply))
            query = apply(query, _request.Descending);
        else if (_defaultSort is not null)
            query = _defaultSort(query);

        // Page and project to the row DTO in a single SQL round-trip.
        var items = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(selector)
            .ToListAsync();

        var totalPages = (int)Math.Ceiling(totalCount / (double)pageSize);
        return new PagedResult<TDto>(items, page, pageSize, totalCount, totalPages);
    }
}

public static class DataTableExtensions
{
    // Entry point: db.Users.ToDataTable(request).Searchable(...).Sortable(...)...
    public static DataTableBuilder<T> ToDataTable<T>(this IQueryable<T> query, DataTableRequest request)
        => new(query, request);
}
