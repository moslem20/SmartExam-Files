using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Data;
using System.IO;
using System.Text.Json;
using System.Threading.Tasks;
using WebApplication1.Models;

namespace WebApplication1.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class QuestionsController : ControllerBase
    {
        private readonly ILogger<QuestionsController> _logger;
        private readonly string _uploadPath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "Uploads");

        public QuestionsController(ILogger<QuestionsController> logger)
        {
            _logger = logger;
            if (!Directory.Exists(_uploadPath))
            {
                Directory.CreateDirectory(_uploadPath);
            }
        }

        [HttpPost]
        public IActionResult CreateQuestion([FromBody] QuestionCreateRequest request)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    return BadRequest(ModelState);
                }

                // Ensure Answer is null during question creation
                if (request.Answer != null)
                {
                    return BadRequest("Answer field must be null during question creation.");
                }

                // Validate fields based on question type
                switch (request.QuestionType.ToLower())
                {
                    case "open":
                        if (string.IsNullOrEmpty(request.CorrectAnswer))
                            return BadRequest("CorrectAnswer is required for Open-Ended questions.");
                        if (request.Options != null || request.IsTrue != null || request.Pairs != null || request.ImageUrl != null)
                            return BadRequest("Options, IsTrue, Pairs, and ImageUrl must be null for Open-Ended questions.");
                        break;

                    case "mc":
                        if (string.IsNullOrEmpty(request.Options) || string.IsNullOrEmpty(request.CorrectAnswer))
                            return BadRequest("Options and CorrectAnswer are required for Multiple Choice questions.");
                        if (request.IsTrue != null || request.Pairs != null || request.ImageUrl != null)
                            return BadRequest("IsTrue, Pairs, and ImageUrl must be null for Multiple Choice questions.");
                        break;

                    case "truefalse":
                        if (request.IsTrue == null)
                            return BadRequest("IsTrue is required for True/False questions.");
                        if (request.CorrectAnswer != null || request.Options != null || request.Pairs != null || request.ImageUrl != null)
                            return BadRequest("CorrectAnswer, Options, Pairs, and ImageUrl must be null for True/False questions.");
                        break;

                    case "matching":
                        if (string.IsNullOrEmpty(request.Pairs))
                            return BadRequest("Pairs is required for Matching questions.");
                        if (request.CorrectAnswer != null || request.Options != null || request.IsTrue != null || request.ImageUrl != null)
                            return BadRequest("CorrectAnswer, Options, IsTrue, and ImageUrl must be null for Matching questions.");
                        break;

                    case "photo":
                        if (string.IsNullOrEmpty(request.ImageUrl) || string.IsNullOrEmpty(request.CorrectAnswer))
                            return BadRequest("ImageUrl and CorrectAnswer are required for Photo questions.");
                        if (request.Options != null || request.IsTrue != null || request.Pairs != null)
                            return BadRequest("Options, IsTrue, and Pairs must be null for Photo questions.");
                        break;

                    default:
                        return BadRequest("Invalid QuestionType.");
                }

                var question = new QuestionModel
                {
                    ClassExamId = request.ClassExamId,
                    QuestionType = request.QuestionType,
                    QuestionText = request.QuestionText,
                    Answer = null,
                    CorrectAnswer = request.CorrectAnswer,
                    Options = request.Options,
                    IsTrue = request.IsTrue,
                    Pairs = request.Pairs != null ? JsonSerializer.Deserialize<List<QuestionModel.MatchingPair>>(request.Pairs) : null,
                    ImageUrl = request.ImageUrl,
                    TimeLimit = request.TimeLimit ?? 30
                };

                var (success, error) = QuestionModel.Create(question);
                if (!success)
                {
                    _logger.LogError($"Error creating question: {error}");
                    return BadRequest(error);
                }

                return Ok(new { questionId = question.QuestionId });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in CreateQuestion");
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        [HttpPost("upload-image")]
        public async Task<IActionResult> UploadImage(IFormFile image)
        {
            try
            {
                if (image == null || image.Length == 0)
                {
                    return BadRequest("No image provided");
                }

                var fileName = $"{Guid.NewGuid()}_{image.FileName}";
                var filePath = Path.Combine(_uploadPath, fileName);

                using (var stream = new FileStream(filePath, FileMode.Create))
                {
                    await image.CopyToAsync(stream);
                }

                var imageUrl = $"http://smartexam.somee.com/Uploads/{fileName}";
                _logger.LogInformation($"Image uploaded: {imageUrl}");
                return Ok(new { imageUrl });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error uploading image");
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        [HttpGet("by-exam/{examId}")]
        public IActionResult GetQuestionsByExamId(int examId)
        {
            try
            {
                var questions = QuestionModel.GetByExamId(examId);
                if (questions == null || questions.Count == 0)
                {
                    return NotFound("No questions found for the specified exam.");
                }
                return Ok(questions);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetQuestionsByExamId");
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        [HttpPost("answers")]
        public IActionResult SubmitAnswers([FromBody] AnswerSubmission submission)
        {
            try
            {
                if (submission == null || submission.Answers == null || !submission.Answers.Any())
                {
                    return BadRequest("Invalid submission data");
                }

                int classExamId = submission.ExamId; // Adjust if ExamId needs conversion to ClassExamId via ClassExams
                foreach (var answer in submission.Answers)
                {
                    // Check for existing answer
                    using var conn = new SqlConnection(StudentAnswerModel.GetConnectionString());
                    conn.Open();
                    var checkQuery = @"
                        SELECT COUNT(*) 
                        FROM StudentAnswers 
                        WHERE QuestionId = @QuestionId AND StudentId = @StudentId";
                    using var checkCmd = new SqlCommand(checkQuery, conn);
                    checkCmd.Parameters.AddWithValue("@QuestionId", answer.QuestionId);
                    checkCmd.Parameters.AddWithValue("@StudentId", submission.StudentId);
                    int existingCount = (int)checkCmd.ExecuteScalar();
                    if (existingCount > 0)
                    {
                        _logger.LogWarning($"Answer already exists for QuestionId {answer.QuestionId} and StudentId {submission.StudentId}");
                        continue; // Skip to avoid duplicates
                    }

                    var studentAnswer = new StudentAnswerModel
                    {
                        AnswerId = Guid.NewGuid().ToString(),
                        QuestionId = answer.QuestionId,
                        ClassExamId = classExamId,
                        StudentId = submission.StudentId,
                        AnswerText = answer.AnswerText ?? "No answer provided",
                        SelectedOption = answer.AnswerText,
                        SubmittedDate = DateTime.Parse(submission.Timestamp),
                        Grade = answer.Grade // Store grade if provided
                    };

                    var (success, error) = StudentAnswerModel.SubmitAnswer(studentAnswer);
                    if (!success)
                    {
                        _logger.LogError($"Error saving answer for QuestionId {answer.QuestionId} and StudentId {submission.StudentId}: {error}");
                        return BadRequest(error);
                    }
                }

                return Ok();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error submitting answers");
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        [HttpGet("answers/by-exam/{examId}")]
        public IActionResult GetAnswersByExamId(int examId)
        {
            try
            {
                if (examId <= 0)
                {
                    return BadRequest("Invalid examId");
                }

                var answers = new List<StudentAnswerModel>();
                using var conn = new SqlConnection(StudentAnswerModel.GetConnectionString());
                conn.Open();

                var query = @"
                    SELECT sa.AnswerId, sa.QuestionId, sa.ClassExamId, sa.StudentId, sa.AnswerText, sa.SelectedOption, sa.IsTrue, sa.MatchingPairs, sa.SubmittedDate, sa.Grade
                    FROM StudentAnswers sa
                    INNER JOIN Questions q ON sa.QuestionId = q.QuestionId
                    WHERE q.ClassExamId = @ClassExamId";

                using var cmd = new SqlCommand(query, conn);
                cmd.Parameters.AddWithValue("@ClassExamId", examId);

                using var reader = cmd.ExecuteReader();
                while (reader.Read())
                {
                    var answer = new StudentAnswerModel
                    {
                        AnswerId = reader["AnswerId"].ToString() ?? string.Empty,
                        QuestionId = reader["QuestionId"].ToString() ?? string.Empty,
                        ClassExamId = reader.GetInt32("ClassExamId"),
                        StudentId = reader["StudentId"].ToString() ?? string.Empty,
                        AnswerText = reader["AnswerText"].ToString(),
                        SelectedOption = reader["SelectedOption"].ToString(),
                        IsTrue = reader["IsTrue"] != DBNull.Value ? reader.GetBoolean("IsTrue") : (bool?)null,
                        MatchingPairs = reader["MatchingPairs"] != DBNull.Value ? JsonSerializer.Deserialize<List<QuestionModel.MatchingPair>>(reader["MatchingPairs"].ToString()) : null,
                        SubmittedDate = reader.GetDateTime("SubmittedDate"),
                        Grade = reader["Grade"] != DBNull.Value ? reader.GetDecimal("Grade") : (decimal?)null
                    };
                    answers.Add(answer);
                }

                if (answers.Count == 0)
                {
                    return NotFound("No answers found for the specified exam.");
                }

                return Ok(answers);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetAnswersByExamId");
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        [HttpPut("answers/{answerId}")]
        public IActionResult UpdateAnswerGrade(string answerId, [FromBody] StudentAnswerModel updatedAnswer)
        {
            try
            {
                if (string.IsNullOrEmpty(answerId) || updatedAnswer == null || updatedAnswer.Grade == null)
                {
                    return BadRequest("Invalid input data");
                }

                using var conn = new SqlConnection(StudentAnswerModel.GetConnectionString());
                conn.Open();

                var query = @"
                    UPDATE StudentAnswers
                    SET Grade = @Grade, SubmittedDate = @SubmittedDate
                    WHERE AnswerId = @AnswerId";

                using var cmd = new SqlCommand(query, conn);
                cmd.Parameters.AddWithValue("@AnswerId", answerId);
                cmd.Parameters.AddWithValue("@Grade", updatedAnswer.Grade);
                cmd.Parameters.AddWithValue("@SubmittedDate", updatedAnswer.SubmittedDate);

                int rowsAffected = cmd.ExecuteNonQuery();
                if (rowsAffected == 0)
                {
                    return NotFound("Answer not found");
                }

                return Ok();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating answer grade");
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        [HttpGet("questions/{questionId}")]
        public IActionResult GetQuestionById(string questionId)
        {
            try
            {
                if (string.IsNullOrEmpty(questionId))
                {
                    return BadRequest("QuestionId is required");
                }

                var question = QuestionModel.GetById(questionId);
                if (question == null)
                {
                    return NotFound("Question not found");
                }

                return Ok(question);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetQuestionById");
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        [HttpGet("images/{fileName}")]
        public IActionResult GetImage(string fileName)
        {
            try
            {
                if (string.IsNullOrEmpty(fileName))
                {
                    return BadRequest("Filename is required");
                }

                var filePath = Path.Combine(_uploadPath, fileName);
                if (!System.IO.File.Exists(filePath))
                {
                    return NotFound("Image not found");
                }

                if (fileName.Contains(".."))
                {
                    return BadRequest("Invalid filename");
                }

                var mimeType = GetMimeType(fileName);
                return PhysicalFile(filePath, mimeType);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving image");
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        private string GetMimeType(string fileName)
        {
            var extension = Path.GetExtension(fileName).ToLowerInvariant();
            return extension switch
            {
                ".jpg" or ".jpeg" => "image/jpeg",
                ".png" => "image/png",
                ".gif" => "image/gif",
                _ => "application/octet-stream",
            };
        }
    }

    public class AnswerSubmission
    {
        [Required]
        public int ExamId { get; set; }

        [Required]
        public string StudentId { get; set; } = string.Empty;

        [Required]
        public string Timestamp { get; set; } = string.Empty;

        [Required]
        public List<AnswerData> Answers { get; set; } = new List<AnswerData>();
    }

    public class AnswerData
    {
        [Required]
        public string QuestionId { get; set; } = string.Empty;

        public string? AnswerText { get; set; }

        [Range(0, 100)]
        public decimal? Grade { get; set; }
    }
}