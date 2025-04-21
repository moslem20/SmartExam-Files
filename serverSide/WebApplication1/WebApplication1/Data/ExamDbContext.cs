using Microsoft.EntityFrameworkCore;
using WebApplication1.Models;  // ✅ Add this to use the correct Grade model

namespace WebApplication1.Data
{
    public class ExamDbContext : DbContext
    {
        public ExamDbContext(DbContextOptions<ExamDbContext> options) : base(options) { }

        public DbSet<Grades> Grades { get; set; }  // ✅ Uses Grade from WebApplication1.Models
    }
}
