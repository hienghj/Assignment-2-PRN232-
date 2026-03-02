using System.Net;
using System.Text.Json;

namespace ClothingStore.API.Middleware
{
    public class ExceptionHandlingMiddleware
    {
        private readonly RequestDelegate _next;
        private readonly ILogger<ExceptionHandlingMiddleware> _logger;

        public ExceptionHandlingMiddleware(RequestDelegate next, ILogger<ExceptionHandlingMiddleware> logger)
        {
            _next = next;
            _logger = logger;
        }

        public async Task InvokeAsync(HttpContext context)
        {
            try
            {
                await _next(context);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "An unhandled exception occurred");
                await HandleExceptionAsync(context, ex);
            }
        }

        private static async Task HandleExceptionAsync(HttpContext context, Exception exception)
        {
            context.Response.ContentType = "application/json";

            var (statusCode, message) = exception switch
            {
                UnauthorizedAccessException => ((int)HttpStatusCode.Unauthorized, exception.Message),
                InvalidOperationException => ((int)HttpStatusCode.BadRequest, exception.Message),
                KeyNotFoundException => ((int)HttpStatusCode.NotFound, exception.Message),
                _ => ((int)HttpStatusCode.InternalServerError, "An internal server error occurred")
            };

            context.Response.StatusCode = statusCode;

            var response = JsonSerializer.Serialize(new { message, statusCode });
            await context.Response.WriteAsync(response);
        }
    }
}
