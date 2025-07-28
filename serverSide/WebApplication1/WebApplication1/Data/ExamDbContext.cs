using Microsoft.EntityFrameworkCore;
using WebApplication1.Models;

namespace WebApplication1.Data
{
    public class ExamDbContext : DbContext
    {
        public ExamDbContext(DbContextOptions<ExamDbContext> options) : base(options) { }

        public DbSet<Grades> Grades { get; set; }
        public DbSet<Exam> Exams { get; set; }

        //<-- for message model -->

        public DbSet<MessageModel> Messages { get; set; }
        public DbSet<ClassModel> Classes { get; set; }
        public DbSet<AppUser> Users { get; set; }
        public DbSet<ClassExamModel> ClassExams { get; set; }
        public DbSet<Appeal> Appeals { get; set; }

        public DbSet<Feedback> Feedbacks { get; set; }


        //<----------------------->
    }
}