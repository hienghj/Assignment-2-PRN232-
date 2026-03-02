using ClothingStore.API.Data;
using ClothingStore.API.DTOs;
using ClothingStore.API.Models;
using Microsoft.EntityFrameworkCore;

namespace ClothingStore.API.Services
{
    public class OrderService
    {
        private readonly AppDbContext _context;
        private readonly CartService _cartService;

        public OrderService(AppDbContext context, CartService cartService)
        {
            _context = context;
            _cartService = cartService;
        }

        public async Task<OrderResponseDto> PlaceOrder(int userId)
        {
            var cart = await _cartService.GetCart(userId);

            if (!cart.Items.Any())
                throw new InvalidOperationException("Cart is empty");

            var order = new Order
            {
                UserId = userId,
                TotalAmount = cart.TotalPrice,
                Status = "pending",
                CreatedAt = DateTime.UtcNow
            };

            _context.Orders.Add(order);
            await _context.SaveChangesAsync();

            // Create order items from cart
            foreach (var item in cart.Items)
            {
                var orderItem = new OrderItem
                {
                    OrderId = order.Id,
                    ProductId = item.ProductId,
                    Quantity = item.Quantity,
                    Price = item.ProductPrice
                };
                _context.OrderItems.Add(orderItem);
            }

            await _context.SaveChangesAsync();

            // Clear cart after placing order
            await _cartService.ClearCart(userId);

            return await GetOrderById(userId, order.Id) ?? throw new Exception("Order creation failed");
        }

        public async Task<List<OrderResponseDto>> GetUserOrders(int userId)
        {
            var orders = await _context.Orders
                .Where(o => o.UserId == userId)
                .Include(o => o.OrderItems)
                    .ThenInclude(oi => oi.Product)
                .OrderByDescending(o => o.CreatedAt)
                .ToListAsync();

            return orders.Select(MapToDto).ToList();
        }

        public async Task<OrderResponseDto?> GetOrderById(int userId, int orderId)
        {
            var order = await _context.Orders
                .Where(o => o.Id == orderId && o.UserId == userId)
                .Include(o => o.OrderItems)
                    .ThenInclude(oi => oi.Product)
                .FirstOrDefaultAsync();

            return order == null ? null : MapToDto(order);
        }

        public async Task<OrderResponseDto?> UpdateOrderStatus(int orderId, string status)
        {
            var order = await _context.Orders
                .Include(o => o.OrderItems)
                    .ThenInclude(oi => oi.Product)
                .FirstOrDefaultAsync(o => o.Id == orderId);

            if (order == null) return null;

            order.Status = status;
            await _context.SaveChangesAsync();

            return MapToDto(order);
        }

        private static OrderResponseDto MapToDto(Order order)
        {
            return new OrderResponseDto
            {
                Id = order.Id,
                TotalAmount = order.TotalAmount,
                Status = order.Status,
                CreatedAt = order.CreatedAt,
                Items = order.OrderItems.Select(oi => new OrderItemResponseDto
                {
                    Id = oi.Id,
                    ProductId = oi.ProductId,
                    ProductName = oi.Product?.Name ?? "Unknown",
                    ProductImage = oi.Product?.ImageUrl,
                    Price = oi.Price,
                    Quantity = oi.Quantity,
                    Subtotal = oi.Price * oi.Quantity
                }).ToList()
            };
        }
    }
}
