using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using System;
using System.ComponentModel.DataAnnotations;
using System.Text.Json;
using System.Threading.Tasks;
using WebApplication1.Data;
using WebApplication1.Models;

namespace WebApplication1.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ClassExamsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<ClassExamsController> _logger;
        private readonly IConfiguration _configuration;

        public ClassExamsController(ApplicationDbContext context, ILogger<ClassExamsController> logger, IConfiguration configuration)
        {
            _context = context;
            _logger = logger;
            _configuration = configuration;
        }

        [HttpPost]
        public async Task<IActionResult> CreateClassExamWithQuestions([FromBody] ClassExamCreateRequest request)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    return BadRequest(ModelState);
                }

                var classExists = await _context.Classes.AnyAsync(c => c.Id == request.ClassId);
                var examExists = await _context.Exams.AnyAsync(e => e.ExamId == request.ExamId);
                if (!classExists || !examExists)
                {
                    return BadRequest(new { message = "Invalid ClassId or ExamId" });
                }

                var classExam = new ClassExamModel
                {
                    ClassId = request.ClassId,
                    ExamId = request.ExamId
                };

                _context.ClassExams.Add(classExam);
                await _context.SaveChangesAsync();

                foreach (var q in request.Questions)
                {
                    // Validate question based on type
                    switch (q.QuestionType.ToLower())
                    {
                        case "mc":
                            if (string.IsNullOrEmpty(q.Options) || string.IsNullOrEmpty(q.CorrectAnswer))
                                return BadRequest("Options and CorrectAnswer are required for Multiple Choice questions.");
                            if (q.IsTrue != null || q.Pairs != null || q.ImageUrl != null)
                                return BadRequest("IsTrue, Pairs, and ImageUrl must be null for Multiple Choice questions.");
                            break;
                        case "open":
                            if (string.IsNullOrEmpty(q.CorrectAnswer))
                                return BadRequest("CorrectAnswer is required for Open-Ended questions.");
                            if (q.Options != null || q.IsTrue != null || q.Pairs != null || q.ImageUrl != null)
                                return BadRequest("Options, IsTrue, Pairs, and ImageUrl must be null for Open-Ended questions.");
                            break;
                        case "truefalse":
                            if (q.IsTrue == null)
                                return BadRequest("IsTrue is required for True/False questions.");
                            if (q.CorrectAnswer != null || q.Options != null || q.Pairs != null || q.ImageUrl != null)
                                return BadRequest("CorrectAnswer, Options, Pairs, and ImageUrl must be null for True/False questions.");
                            break;
                        case "matching":
                            if (string.IsNullOrEmpty(q.Pairs))
                                return BadRequest("Pairs is required for Matching questions.");
                            if (q.Options != null || q.IsTrue != null || q.CorrectAnswer != null || q.ImageUrl != null)
                                return BadRequest("Options, IsTrue, CorrectAnswer, and ImageUrl must be null for Matching questions.");
                            break;
                        case "photo":
                        case "photowithtext":
                            if (string.IsNullOrEmpty(q.ImageUrl))
                                return BadRequest("ImageUrl is required for Photo questions.");
                            if (q.Options != null || q.IsTrue != null || q.Pairs != null)
                                return BadRequest("Options, IsTrue, and Pairs must be null for Photo questions.");
                            break;
                        default:
                            return BadRequest($"Invalid question type: {q.QuestionType}");
                    }

                    var question = new QuestionModel
                    {
                        QuestionId = Guid.NewGuid().ToString(),
                        ClassExamId = classExam.Id,
                        QuestionType = q.QuestionType,
                        QuestionText = q.QuestionText,
                        Answer = q.Answer,
                        Options = q.Options,
                        CorrectAnswer = q.CorrectAnswer,
                        IsTrue = q.IsTrue,
                        Pairs = q.Pairs != null ? JsonSerializer.Deserialize<List<QuestionModel.MatchingPair>>(q.Pairs) : null,
                        ImageUrl = q.ImageUrl,
                        TimeLimit = q.TimeLimit ?? 30
                    };

                    var (success, error) = QuestionModel.Create(question);
                    if (!success)
                    {
                        _logger.LogError($"Error creating question: {error}");
                        return BadRequest(error);
                    }
                }

                await _context.SaveChangesAsync();

                return Ok(new { classExamId = classExam.Id });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in CreateClassExamWithQuestions");
                return StatusCode(500, new { message = $"Internal server error: {ex.Message}" });
            }
        }

        [HttpGet("exam/{examId}/class-exam-id")]
        public async Task<IActionResult> GetClassExamIdByExamId(int examId)
        {
            try
            {
                var classExam = await _context.ClassExams
                    .Where(ce => ce.ExamId == examId)
                    .Select(ce => new { ce.Id })
                    .FirstOrDefaultAsync();

                if (classExam == null)
                {
                    return NotFound(new { message = "No ClassExam found for the specified ExamId" });
                }

                return Ok(classExam.Id);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetClassExamIdByExamId");
                return StatusCode(500, new { message = $"Internal server error: {ex.Message}" });
            }
        }
    }

    public class ClassExamCreateRequest
    {
        [Required]
        public string ClassId { get; set; } = string.Empty;

        [Required]
        public int ExamId { get; set; }

        [Required]
        public List<QuestionCreateRequest> Questions { get; set; } = new List<QuestionCreateRequest>();
    }
}