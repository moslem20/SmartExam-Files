using Microsoft.OpenApi.Models;

namespace WebApplication1
{
    internal class Info : OpenApiInfo
    {
        public string Title { get; set; }
        public string Version { get; set; }
    }
}