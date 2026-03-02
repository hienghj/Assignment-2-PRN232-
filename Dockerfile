FROM mcr.microsoft.com/dotnet/sdk:9.0-alpine AS build
WORKDIR /src
COPY *.csproj ./
RUN dotnet restore --runtime linux-musl-x64
COPY . .
RUN dotnet publish -c Release -o /app/publish --no-restore --runtime linux-musl-x64 --self-contained false /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:9.0-alpine
WORKDIR /app
COPY --from=build /app/publish .
EXPOSE 10000
ENTRYPOINT ["dotnet", "ClothingStore.API.dll"]
