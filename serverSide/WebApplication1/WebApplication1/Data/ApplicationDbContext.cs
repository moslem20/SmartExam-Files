using Microsoft.EntityFrameworkCore;
using WebApplication1.Models; // <-- adjust to your namespace

public class ApplicationDbContext : DbContext
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
        : base(options)
    {
    }

    public DbSet<Exam> Exams { get; set; } = default!;
}
