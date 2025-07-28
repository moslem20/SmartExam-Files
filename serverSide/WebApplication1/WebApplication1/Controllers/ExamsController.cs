using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using System;
using System.ComponentModel.DataAnnotations;
using System.Threading.Tasks;
using WebApplication1.Data;
using WebApplication1.Models;

namespace WebApplication1.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ExamsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<ExamsController> _logger;

        public ExamsController(ApplicationDbContext context, ILogger<ExamsController> logger)
        {
            _context = context;
            _logger = logger;
        }

        [HttpGet]
        public async Task<IActionResult> GetAllExams()
        {
            var exams = await _context.Exams!.ToListAsync();
            return Ok(exams);
        }

        [HttpGet("today")]
        public async Task<IActionResult> GetTodayExams()
        {
            var today = DateTime.Today;
            var todayExams = await _context.Exams!
                .Where(e => e.ExamDate == today)
                .ToListAsync();
            return Ok(todayExams);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetExamById(int id)
        {
            try
            {
                var exam = await _context.Exams!.FindAsync(id);
                if (exam == null)
                {
                    return NotFound(new { message = $"No exam found with ID {id}" });
                }

                return Ok(new
                {
                    exam.ExamId,
                    exam.Title,
                    exam.ExamDate,
                    exam.Course,
                    exam.Time,
                    exam.Description
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error fetching exam with ID {id}");
                return StatusCode(500, new { message = $"Internal server error: {ex.Message}" });
            }
        }

        [HttpPost]
        public async Task<IActionResult> AddExam([FromBody] ExamCreateRequest request)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    return BadRequest(ModelState);
                }

                var classExists = await _context.Classes!.AnyAsync(c => c.CourseName == request.Course);
                if (!classExists)
                {
                    return BadRequest(new { message = $"Invalid Class Name: {request.Course}" });
                }

                var exam = new Exam
                {
                    Title = request.Title,
                    ExamDate = request.ExamDate,
                    Course = request.Course,
                    Time = request.Time,
                    Description = request.Description ?? string.Empty
                };

                _context.Exams!.Add(exam);
                await _context.SaveChangesAsync();

                return Ok(new
                {
                    examId = exam.ExamId,
                    exam.Title,
                    exam.ExamDate,
                    exam.Course,
                    exam.Time,
                    exam.Description
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating exam");
                return StatusCode(500, new { message = $"Internal server error: {ex.Message}" });
            }
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteExam(int id)
        {
            try
            {
                var exam = await _context.Exams!.FindAsync(id);
                if (exam == null)
                {
                    return NotFound(new { message = $"No exam found with ID {id}" });
                }

                // Step 1: Get ClassExams related to this Exam
                var classExams = await _context.ClassExams!
                    .Where(ce => ce.ExamId == id)
                    .ToListAsync();

                if (classExams.Any())
                {
                    // Step 2: Get related Question IDs
                    var classExamIds = classExams.Select(ce => ce.Id).ToList();
                    var questions = await _context.Questions!
                        .Where(q => classExamIds.Contains(q.ClassExamId))
                        .ToListAsync();

                    if (questions.Any())
                    {
                        var questionIds = questions.Select(q => q.QuestionId.ToString()).ToList(); // Ensure string GUIDs

                        // Step 3: Delete StudentAnswers that depend on these Questions
                        var studentAnswers = await _context.StudentAnswers!
                            .Where(sa => questionIds.Contains(sa.QuestionId))
                            .ToListAsync();

                        if (studentAnswers.Any())
                        {
                            _context.StudentAnswers!.RemoveRange(studentAnswers);
                            await _context.SaveChangesAsync(); // Save after deleting StudentAnswers
                        }

                        // Step 4: Delete Questions
                        _context.Questions!.RemoveRange(questions);
                    }

                    // Step 5: Delete ClassExams
                    _context.ClassExams!.RemoveRange(classExams);
                }

                // Step 6: Delete the Exam
                _context.Exams!.Remove(exam);

                await _context.SaveChangesAsync();

                _logger.LogInformation($"Exam with ID {id} deleted successfully.");
                return Ok(new { message = "Exam deleted successfully", deletedExam = exam });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error deleting exam with ID {id}. Inner Exception: {ex.InnerException?.Message}");
                return StatusCode(500, new
                {
                    message = $"Internal server error: {ex.Message}",
                    details = ex.StackTrace,
                    innerException = ex.InnerException?.Message
                });
            }
        }

    }

    public class ExamCreateRequest
    {
        [Required]
        public string Title { get; set; } = string.Empty;

        [Required]
        public DateTime ExamDate { get; set; }

        [Required]
        public string Course { get; set; } = string.Empty;

        [Required]
        public string Time { get; set; } = string.Empty;

        public string? Description { get; set; }
    }
}