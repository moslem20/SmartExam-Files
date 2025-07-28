using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using System.Text.Json;
using WebApplication1.Models;

namespace WebApplication1.Data
{
    public class ApplicationDbContext : DbContext
    {
        private readonly ILogger<ApplicationDbContext> _logger;
        private readonly IConfiguration _configuration;

        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options, ILogger<ApplicationDbContext> logger, IConfiguration configuration)
            : base(options)
        {
            _logger = logger;
            _configuration = configuration;
        }

        public DbSet<Exam>? Exams { get; set; }
        public DbSet<ClassExamModel>? ClassExams { get; set; }
        public DbSet<QuestionModel>? Questions { get; set; }
        public DbSet<ClassModel>? Classes { get; set; }
        public DbSet<AppUser>? Users { get; set; }
        public DbSet<Grades>? Grades { get; set; }
        public DbSet<StudentAnswerModel>? StudentAnswers { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            try
            {
                // Exam
                modelBuilder.Entity<Exam>()
                    .HasKey(e => e.ExamId);
                modelBuilder.Entity<Exam>()
                    .Property(e => e.Title)
                    .IsRequired();
                modelBuilder.Entity<Exam>()
                    .Property(e => e.ExamDate)
                    .IsRequired();
                modelBuilder.Entity<Exam>()
                    .Property(e => e.Course)
                    .IsRequired()
                    .HasColumnType("nvarchar(450)");
                modelBuilder.Entity<Exam>()
                    .Property(e => e.Time)
                    .IsRequired();

                // ClassExamModel
                modelBuilder.Entity<ClassExamModel>()
                    .HasKey(ce => ce.Id);
                modelBuilder.Entity<ClassExamModel>()
                    .Property(ce => ce.ClassId)
                    .HasColumnType("nvarchar(450)")
                    .IsRequired();
                modelBuilder.Entity<ClassExamModel>()
                    .Property(ce => ce.ExamId)
                    .IsRequired();
                modelBuilder.Entity<ClassExamModel>()
                    .HasOne<Exam>()
                    .WithMany()
                    .HasForeignKey(ce => ce.ExamId)
                    .OnDelete(DeleteBehavior.Cascade);

                // QuestionModel
                modelBuilder.Entity<QuestionModel>()
                    .HasKey(q => q.QuestionId);
                modelBuilder.Entity<QuestionModel>()
                    .Property(q => q.QuestionType)
                    .IsRequired();
                modelBuilder.Entity<QuestionModel>()
                    .Property(q => q.QuestionText)
                    .IsRequired();
                modelBuilder.Entity<QuestionModel>()
                    .Property(q => q.ClassExamId)
                    .IsRequired();
                modelBuilder.Entity<QuestionModel>()
                    .Property(q => q.Options)
                    .HasColumnType("nvarchar(max)");
                modelBuilder.Entity<QuestionModel>()
                    .Property(q => q.Pairs)
                    .HasColumnType("nvarchar(max)")
                    .HasConversion(
                        pairs => pairs != null ? JsonSerializer.Serialize(pairs, (JsonSerializerOptions?)null) : null,
                        json => json != null ? JsonSerializer.Deserialize<List<QuestionModel.MatchingPair>>(json, (JsonSerializerOptions?)null) : null
                    );
                modelBuilder.Entity<QuestionModel>()
                    .HasOne<ClassExamModel>()
                    .WithMany()
                    .HasForeignKey(q => q.ClassExamId)
                    .OnDelete(DeleteBehavior.Cascade);

                // StudentAnswerModel
                modelBuilder.Entity<StudentAnswerModel>()
                    .HasKey(sa => sa.AnswerId);
                modelBuilder.Entity<StudentAnswerModel>()
                    .Property(sa => sa.QuestionId)
                    .IsRequired();
                modelBuilder.Entity<StudentAnswerModel>()
                    .Property(sa => sa.ClassExamId)
                    .IsRequired();
                modelBuilder.Entity<StudentAnswerModel>()
                    .Property(sa => sa.StudentId)
                    .IsRequired();
                modelBuilder.Entity<StudentAnswerModel>()
                    .Property(sa => sa.MatchingPairs)
                    .HasColumnType("nvarchar(max)")
                    .HasConversion(
                        pairs => pairs != null ? JsonSerializer.Serialize(pairs, (JsonSerializerOptions?)null) : null,
                        json => json != null ? JsonSerializer.Deserialize<List<QuestionModel.MatchingPair>>(json, (JsonSerializerOptions?)null) : null
                    );
                modelBuilder.Entity<StudentAnswerModel>()
                    .HasOne(sa => sa.Question)
                    .WithMany()
                    .HasForeignKey(sa => sa.QuestionId)
                    .OnDelete(DeleteBehavior.Cascade);

                // ClassModel
                modelBuilder.Entity<ClassModel>()
                    .HasKey(c => c.Id);
                modelBuilder.Entity<ClassModel>()
                    .Property(c => c.Id)
                    .HasColumnType("nvarchar(450)");
                modelBuilder.Entity<ClassModel>()
                    .Property(c => c.CourseName)
                    .IsRequired();
                modelBuilder.Entity<ClassModel>()
                    .Property(c => c.TeacherEmail)
                    .IsRequired();
                modelBuilder.Entity<ClassModel>()
                    .Ignore(c => c.StudentIds);

                // AppUser
                modelBuilder.Entity<AppUser>()
                    .HasKey(u => u.StudentId);
                modelBuilder.Entity<AppUser>()
                    .Property(u => u.StudentId)
                    .HasColumnType("nvarchar(450)");
                modelBuilder.Entity<AppUser>()
                    .Property(u => u.Email)
                    .IsRequired();
                modelBuilder.Entity<AppUser>()
                    .HasIndex(u => u.StudentId)
                    .IsUnique();

                // Grades
                modelBuilder.Entity<Grades>()
                    .HasKey(g => g.GradeId);
                modelBuilder.Entity<Grades>()
                    .Property(g => g.ExamId)
                    .IsRequired();
                modelBuilder.Entity<Grades>()
                    .Property(g => g.StudentId)
                    .HasColumnType("nvarchar(450)");
                modelBuilder.Entity<Grades>()
                    .HasOne<Exam>()
                    .WithMany()
                    .HasForeignKey(g => g.ExamId)
                    .OnDelete(DeleteBehavior.Cascade);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error configuring model in OnModelCreating");
                throw;
            }
        }
    }
}