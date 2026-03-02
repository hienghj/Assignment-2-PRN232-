using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using ClothingStore.API.Data;
using ClothingStore.API.DTOs;
using ClothingStore.API.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

namespace ClothingStore.API.Services
{
    public class AuthService
    {
        private readonly AppDbContext _context;
        private readonly IConfiguration _configuration;

        public AuthService(AppDbContext context, IConfiguration configuration)
        {
            _context = context;
            _configuration = configuration;
        }

        public async Task<AuthResponseDto> Register(RegisterDto dto)
        {
            // Check if user already exists
            if (await _context.Users.AnyAsync(u => u.Email == dto.Email))
            {
                throw new InvalidOperationException("Email already registered");
            }

            var user = new User
            {
                Email = dto.Email,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password),
                FullName = dto.FullName,
                Role = "user",
                CreatedAt = DateTime.UtcNow
            };

            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            var token = GenerateJwtToken(user);

            return new AuthResponseDto
            {
                Token = token,
                Email = user.Email,
                FullName = user.FullName,
                UserId = user.Id
            };
        }

        public async Task<AuthResponseDto> Login(LoginDto dto)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == dto.Email);

            if (user == null || !BCrypt.Net.BCrypt.Verify(dto.Password, user.PasswordHash))
            {
                throw new UnauthorizedAccessException("Invalid email or password");
            }

            var token = GenerateJwtToken(user);

            return new AuthResponseDto
            {
                Token = token,
                Email = user.Email,
                FullName = user.FullName,
                UserId = user.Id
            };
        }

        private string GenerateJwtToken(User user)
        {
            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(
                Environment.GetEnvironmentVariable("JWT_KEY") 
                ?? _configuration["Jwt:Key"] 
                ?? "YourSuperSecretKeyThatIsAtLeast32CharactersLong2024!"));

            var claims = new[]
            {
                new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
                new Claim(ClaimTypes.Email, user.Email),
                new Claim(ClaimTypes.Name, user.FullName),
                new Claim(ClaimTypes.Role, user.Role)
            };

            var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            var token = new JwtSecurityToken(
                issuer: _configuration["Jwt:Issuer"] ?? "ClothingStore",
                audience: _configuration["Jwt:Audience"] ?? "ClothingStore",
                claims: claims,
                expires: DateTime.UtcNow.AddDays(7),
                signingCredentials: credentials
            );

            return new JwtSecurityTokenHandler().WriteToken(token);
        }
    }
}
