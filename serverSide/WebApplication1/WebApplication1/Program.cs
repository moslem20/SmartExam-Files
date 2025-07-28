using Microsoft.EntityFrameworkCore;
using WebApplication1.Data;
using Microsoft.OpenApi.Models;

namespace WebApplication1
{
    public class Program
    {
        public static void Main(string[] args)
        {
            var builder = WebApplication.CreateBuilder(args);

            // Add services to the container.
            builder.Services.AddControllers();
            builder.Services.AddEndpointsApiExplorer();
            builder.Services.AddSwaggerGen();

            //test for swagger error
            builder.Services.AddSwaggerGen(c =>
            {
                c.SwaggerDoc("v1", new Info { Title = "API WSVAP (WebSmartView)", Version = "v1" });
                c.ResolveConflictingActions(apiDescriptions => apiDescriptions.First()); //This line
            });

            // ? Add CORS policy (allows all origins, headers, methods)
            builder.Services.AddCors(p =>
                p.AddPolicy("corspolicy", build =>
                    build.AllowAnyOrigin()
                         .AllowAnyHeader()
                         .AllowAnyMethod()));

            // ? Register DB contexts with connection string
            builder.Services.AddDbContext<ExamDbContext>(options =>
                options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

            builder.Services.AddDbContext<ApplicationDbContext>(options =>
                options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

            var app = builder.Build();

            // Configure the HTTP request pipeline.
            if (true)
            {
                app.UseSwagger();

                app.UseSwaggerUI(c =>
                {
                    c.SwaggerEndpoint("v1/swagger.json", "My API V1"); //originally "./swagger/v1/swagger.json"
                });

            }

            //app.UseHttpsRedirection();

            app.UseCors("corspolicy");

            app.UseAuthorization();

            app.MapControllers();

            app.Run();
        }
    }
}
