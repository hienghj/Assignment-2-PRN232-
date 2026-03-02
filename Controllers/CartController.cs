using System.Security.Claims;
using ClothingStore.API.DTOs;
using ClothingStore.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ClothingStore.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class CartController : ControllerBase
    {
        private readonly CartService _cartService;

        public CartController(CartService cartService)
        {
            _cartService = cartService;
        }

        private int GetUserId()
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            return int.Parse(userIdClaim ?? "0");
        }

        [HttpGet]
        public async Task<IActionResult> GetCart()
        {
            var userId = GetUserId();
            var cart = await _cartService.GetCart(userId);
            return Ok(cart);
        }

        [HttpPost]
        public async Task<IActionResult> AddToCart([FromBody] CartAddDto dto)
        {
            try
            {
                var userId = GetUserId();
                var result = await _cartService.AddToCart(userId, dto);
                return Ok(result);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateQuantity(int id, [FromBody] CartUpdateDto dto)
        {
            var userId = GetUserId();
            var result = await _cartService.UpdateQuantity(userId, id, dto);
            if (result == null) return NotFound(new { message = "Cart item not found" });
            return Ok(result);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> RemoveFromCart(int id)
        {
            var userId = GetUserId();
            var success = await _cartService.RemoveFromCart(userId, id);
            if (!success) return NotFound(new { message = "Cart item not found" });
            return Ok(new { message = "Item removed from cart" });
        }
    }
}
