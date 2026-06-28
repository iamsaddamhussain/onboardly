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
COPY --from=build /app .

# Kestrel listens on 8080 by default in the container
EXPOSE 8080
ENTRYPOINT ["dotnet", "Onboardly.Server.dll"]
