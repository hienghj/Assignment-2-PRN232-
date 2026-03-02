using ClothingStore.API.DTOs;
using ClothingStore.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ClothingStore.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ProductsController : ControllerBase
    {
        private readonly ProductService _productService;

        public ProductsController(ProductService productService)
        {
            _productService = productService;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll(
            [FromQuery] string? search,
            [FromQuery] string? category,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 12)
        {
            var products = await _productService.GetAll(search, category, page, pageSize);
            var count = await _productService.GetCount(search, category);

            return Ok(new
            {
                products,
                totalCount = count,
                page,
                pageSize,
                totalPages = (int)Math.Ceiling((double)count / pageSize)
            });
        }

        [HttpGet("categories")]
        public async Task<IActionResult> GetCategories()
        {
            var categories = await _productService.GetCategories();
            return Ok(categories);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var product = await _productService.GetById(id);
            if (product == null) return NotFound(new { message = "Product not found" });
            return Ok(product);
        }

        [Authorize]
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] ProductCreateDto dto)
        {
            var product = await _productService.Create(dto);
            return CreatedAtAction(nameof(GetById), new { id = product.Id }, product);
        }

        [Authorize]
        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, [FromBody] ProductUpdateDto dto)
        {
            var product = await _productService.Update(id, dto);
            if (product == null) return NotFound(new { message = "Product not found" });
            return Ok(product);
        }

        [Authorize]
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var success = await _productService.Delete(id);
            if (!success) return NotFound(new { message = "Product not found" });
            return Ok(new { message = "Product deleted successfully" });
        }
    }
}
