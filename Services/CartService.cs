using ClothingStore.API.Data;
using ClothingStore.API.DTOs;
using ClothingStore.API.Models;
using Microsoft.EntityFrameworkCore;

namespace ClothingStore.API.Services
{
    public class CartService
    {
        private readonly AppDbContext _context;

        public CartService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<CartResponseDto> GetCart(int userId)
        {
            var items = await _context.CartItems
                .Where(c => c.UserId == userId)
                .Include(c => c.Product)
                .ToListAsync();

            var cartItems = items.Select(c => new CartItemResponseDto
            {
                Id = c.Id,
                ProductId = c.ProductId,
                ProductName = c.Product.Name,
                ProductImage = c.Product.ImageUrl,
                ProductPrice = c.Product.Price,
                Quantity = c.Quantity,
                Subtotal = c.Product.Price * c.Quantity
            }).ToList();

            return new CartResponseDto
            {
                Items = cartItems,
                TotalPrice = cartItems.Sum(i => i.Subtotal),
                TotalItems = cartItems.Sum(i => i.Quantity)
            };
        }

        public async Task<CartItemResponseDto> AddToCart(int userId, CartAddDto dto)
        {
            // Check if product exists
            var product = await _context.Products.FindAsync(dto.ProductId);
            if (product == null)
                throw new InvalidOperationException("Product not found");

            // Check if already in cart
            var existing = await _context.CartItems
                .FirstOrDefaultAsync(c => c.UserId == userId && c.ProductId == dto.ProductId);

            if (existing != null)
            {
                existing.Quantity += dto.Quantity;
                await _context.SaveChangesAsync();

                return new CartItemResponseDto
                {
                    Id = existing.Id,
                    ProductId = product.Id,
                    ProductName = product.Name,
                    ProductImage = product.ImageUrl,
                    ProductPrice = product.Price,
                    Quantity = existing.Quantity,
                    Subtotal = product.Price * existing.Quantity
                };
            }

            var cartItem = new CartItem
            {
                UserId = userId,
                ProductId = dto.ProductId,
                Quantity = dto.Quantity
            };

            _context.CartItems.Add(cartItem);
            await _context.SaveChangesAsync();

            return new CartItemResponseDto
            {
                Id = cartItem.Id,
                ProductId = product.Id,
                ProductName = product.Name,
                ProductImage = product.ImageUrl,
                ProductPrice = product.Price,
                Quantity = cartItem.Quantity,
                Subtotal = product.Price * cartItem.Quantity
            };
        }

        public async Task<CartItemResponseDto?> UpdateQuantity(int userId, int cartItemId, CartUpdateDto dto)
        {
            var cartItem = await _context.CartItems
                .Include(c => c.Product)
                .FirstOrDefaultAsync(c => c.Id == cartItemId && c.UserId == userId);

            if (cartItem == null) return null;

            cartItem.Quantity = dto.Quantity;
            await _context.SaveChangesAsync();

            return new CartItemResponseDto
            {
                Id = cartItem.Id,
                ProductId = cartItem.ProductId,
                ProductName = cartItem.Product.Name,
                ProductImage = cartItem.Product.ImageUrl,
                ProductPrice = cartItem.Product.Price,
                Quantity = cartItem.Quantity,
                Subtotal = cartItem.Product.Price * cartItem.Quantity
            };
        }

        public async Task<bool> RemoveFromCart(int userId, int cartItemId)
        {
            var cartItem = await _context.CartItems
                .FirstOrDefaultAsync(c => c.Id == cartItemId && c.UserId == userId);

            if (cartItem == null) return false;

            _context.CartItems.Remove(cartItem);
            await _context.SaveChangesAsync();

            return true;
        }

        public async Task ClearCart(int userId)
        {
            var items = await _context.CartItems.Where(c => c.UserId == userId).ToListAsync();
            _context.CartItems.RemoveRange(items);
            await _context.SaveChangesAsync();
        }
    }
}
