using System.Text;
using ClothingStore.API.Data;
using ClothingStore.API.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;

var builder = WebApplication.CreateBuilder(args);

// Add DbContext - Support DATABASE_URL env var for cloud hosting
var connStr = Environment.GetEnvironmentVariable("DATABASE_URL");
if (string.IsNullOrEmpty(connStr))
{
    connStr = builder.Configuration.GetConnectionString("DefaultConnection");
}
else if (connStr.StartsWith("postgres://"))
{
    // Convert Render/Railway URL format to Npgsql format
    var uri = new Uri(connStr);
    var userInfo = uri.UserInfo.Split(':');
    connStr = $"Host={uri.Host};Port={uri.Port};Database={uri.AbsolutePath.TrimStart('/')};Username={userInfo[0]};Password={userInfo[1]};SSL Mode=Require;Trust Server Certificate=true";
}

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(connStr));

// Add Services
builder.Services.AddScoped<AuthService>();
builder.Services.AddScoped<ProductService>();
builder.Services.AddScoped<CartService>();
builder.Services.AddScoped<OrderService>();

// Add JWT Authentication
var jwtKey = builder.Configuration["Jwt:Key"] ?? "YourSuperSecretKeyThatIsAtLeast32CharactersLong2024!";
builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = builder.Configuration["Jwt:Issuer"] ?? "ClothingStoreAPI",
        ValidAudience = builder.Configuration["Jwt:Audience"] ?? "ClothingStoreClient",
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey))
    };
});

builder.Services.AddAuthorization();

// Add Controllers
builder.Services.AddControllers();

// Add Swagger with JWT support
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "Clothing Store API",
        Version = "v1",
        Description = "E-Commerce Clothing Store RESTful API"
    });

    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "JWT Authorization header using the Bearer scheme. Enter 'Bearer' [space] and then your token.",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.ApiKey,
        Scheme = "Bearer"
    });

    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

// Add CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

// Bind to PORT env variable (for Render/cloud hosting)
var port = Environment.GetEnvironmentVariable("PORT") ?? "5000";
builder.WebHost.UseUrls($"http://0.0.0.0:{port}");

var app = builder.Build();

// Configure the HTTP request pipeline
app.UseMiddleware<ClothingStore.API.Middleware.ExceptionHandlingMiddleware>();

app.UseSwagger();
app.UseSwaggerUI();

app.UseCors("AllowAll");

// Serve static files from wwwroot
app.UseDefaultFiles();
app.UseStaticFiles();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

// Auto-create database tables on startup
try
{
    using (var scope = app.Services.CreateScope())
    {
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        
        // Use raw SQL to create tables if they don't exist
        var sql = @"
            CREATE TABLE IF NOT EXISTS ""Users"" (
                ""Id"" SERIAL PRIMARY KEY,
                ""Email"" VARCHAR(255) NOT NULL UNIQUE,
                ""PasswordHash"" TEXT NOT NULL,
                ""FullName"" VARCHAR(100) NOT NULL DEFAULT '',
                ""Role"" VARCHAR(20) NOT NULL DEFAULT 'user',
                ""CreatedAt"" TIMESTAMP NOT NULL DEFAULT NOW()
            );

            CREATE TABLE IF NOT EXISTS ""Products"" (
                ""Id"" SERIAL PRIMARY KEY,
                ""Name"" VARCHAR(255) NOT NULL,
                ""Description"" TEXT NOT NULL,
                ""Price"" DECIMAL(10,2) NOT NULL,
                ""ImageUrl"" VARCHAR(500),
                ""Category"" VARCHAR(100),
                ""CreatedAt"" TIMESTAMP NOT NULL DEFAULT NOW(),
                ""UpdatedAt"" TIMESTAMP NOT NULL DEFAULT NOW()
            );

            CREATE TABLE IF NOT EXISTS ""CartItems"" (
                ""Id"" SERIAL PRIMARY KEY,
                ""UserId"" INT NOT NULL REFERENCES ""Users""(""Id"") ON DELETE CASCADE,
                ""ProductId"" INT NOT NULL REFERENCES ""Products""(""Id"") ON DELETE CASCADE,
                ""Quantity"" INT NOT NULL DEFAULT 1
            );
            CREATE UNIQUE INDEX IF NOT EXISTS ""IX_CartItems_UserId_ProductId"" ON ""CartItems"" (""UserId"", ""ProductId"");

            CREATE TABLE IF NOT EXISTS ""Orders"" (
                ""Id"" SERIAL PRIMARY KEY,
                ""UserId"" INT NOT NULL REFERENCES ""Users""(""Id"") ON DELETE CASCADE,
                ""TotalAmount"" DECIMAL(10,2) NOT NULL,
                ""Status"" VARCHAR(50) NOT NULL DEFAULT 'pending',
                ""CreatedAt"" TIMESTAMP NOT NULL DEFAULT NOW()
            );

            CREATE TABLE IF NOT EXISTS ""OrderItems"" (
                ""Id"" SERIAL PRIMARY KEY,
                ""OrderId"" INT NOT NULL REFERENCES ""Orders""(""Id"") ON DELETE CASCADE,
                ""ProductId"" INT NOT NULL REFERENCES ""Products""(""Id"") ON DELETE RESTRICT,
                ""Quantity"" INT NOT NULL,
                ""Price"" DECIMAL(10,2) NOT NULL
            );
        ";
        
        db.Database.ExecuteSqlRaw(sql);
        Console.WriteLine("✅ Database connected and tables created successfully!");
    }
}
catch (Exception ex)
{
    Console.WriteLine($"⚠️ Database initialization failed: {ex.Message}");
    Console.WriteLine("Please check your connection string in appsettings.json");
}

app.Run();
