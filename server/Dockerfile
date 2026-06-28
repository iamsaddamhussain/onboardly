# Build stage
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Restore first (better layer caching)
COPY server/Onboardly.Server.csproj server/
RUN dotnet restore server/Onboardly.Server.csproj

# Copy the rest and publish
COPY server/ server/
RUN dotnet publish server/Onboardly.Server.csproj -c Release -o /app

# Runtime stage
FROM mcr.microsoft.com/dotnet/aspnet:10.0
WORKDIR /app

# Npgsql loads Kerberos/GSSAPI at startup; install it to avoid the
# "libgssapi_krb5.so.2: cannot open shared object file" error.
RUN apt-get update \
    && apt-get install -y --no-install-recommends libgssapi-krb5-2 \
    && rm -rf /var/lib/apt/lists/*

COPY --from=build /app .

# Kestrel listens on 8080 by default in the container
EXPOSE 8080
ENTRYPOINT ["dotnet", "Onboardly.Server.dll"]
