using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Threading.Tasks;
using WebApplication1.Data;
using WebApplication1.Models;

namespace WebApplication1.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class GradesController : ControllerBase
    {
        private readonly ExamDbContext _context;
        private readonly ILogger<GradesController> _logger;

        public GradesController(ExamDbContext context, ILogger<GradesController> logger)
        {
            _context = context ?? throw new ArgumentNullException(nameof(context));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<Grades>>> GetGrades()
        {
            try
            {
                var grades = await _context.Grades
                    .Include(g => g.Exam)
                    .ToListAsync();
                return Ok(grades);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving all grades");
                return StatusCode(500, new { message = "Internal server error.", error = ex.Message });
            }
        }

        [HttpGet("student/{studentId}")]
        public async Task<ActionResult<IEnumerable<Grades>>> GetGradesByStudent(string studentId)
        {
            if (string.IsNullOrWhiteSpace(studentId))
                return BadRequest(new { message = "Student ID is required." });

            try
            {
                var studentGrades = await _context.Grades
                    .Where(g => g.StudentId.ToLower() == studentId.ToLower())
                    .Include(g => g.Exam)
                    .ToListAsync();

                if (!studentGrades.Any())
                    return NotFound(new { message = "No grades found for this student." });

                return Ok(studentGrades);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving grades for student {StudentId}", studentId);
                return StatusCode(500, new { message = "Internal server error.", error = ex.Message });
            }
        }

        [HttpGet("exam/{examId}")]
        public async Task<ActionResult<IEnumerable<Grades>>> GetGradesByExamId(int examId)
        {
            try
            {
                var grades = await _context.Grades
                    .Where(g => g.ExamId == examId)
                    .ToListAsync();

                if (!grades.Any())
                    return NotFound(new { message = "No grades found for this exam." });

                return Ok(grades);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving grades for exam {ExamId}", examId);
                return StatusCode(500, new { message = "Internal server error.", error = ex.Message });
            }
        }

        [HttpGet("exam/{examId}/student/{studentId}")]
        public async Task<ActionResult<Grades>> GetGradeByExamAndStudent(int examId, string studentId)
        {
            if (string.IsNullOrWhiteSpace(studentId) || examId <= 0)
                return BadRequest(new { message = "Invalid exam ID or student ID." });

            try
            {
                var grade = await _context.Grades
                    .FirstOrDefaultAsync(g => g.ExamId == examId && g.StudentId.ToLower() == studentId.ToLower());

                if (grade == null)
                    return NotFound(new { message = "Grade not found for this student and exam." });

                return Ok(grade);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving grade for exam {ExamId} and student {StudentId}", examId, studentId);
                return StatusCode(500, new { message = "Internal server error.", error = ex.Message });
            }
        }

        [HttpPost]
        public async Task<ActionResult<Grades>> AddGrade([FromBody] GradesCreateDTO gradeDto)
        {
            if (gradeDto == null)
                return BadRequest(new { message = "Grade data is required." });

            if (string.IsNullOrWhiteSpace(gradeDto.StudentId) ||
                string.IsNullOrWhiteSpace(gradeDto.CourseName) ||
                gradeDto.ExamId <= 0 ||
                gradeDto.Grade < 0 || gradeDto.Grade > 100)
            {
                return BadRequest(new { message = "Invalid grade data." });
            }

            try
            {
                // Validate ExamId exists
                var examExists = await _context.Exams.AnyAsync(e => e.ExamId == gradeDto.ExamId);
                if (!examExists)
                    return BadRequest(new { message = $"Exam with ID {gradeDto.ExamId} not found." });

                // Check for duplicate grade
                var existingGrade = await _context.Grades
                    .FirstOrDefaultAsync(g => g.StudentId.ToLower() == gradeDto.StudentId.ToLower() && g.ExamId == gradeDto.ExamId);
                if (existingGrade != null)
                    return BadRequest(new { message = "A grade already exists for this student and exam." });

                var grade = new Grades
                {
                    StudentId = gradeDto.StudentId,
                    CourseName = gradeDto.CourseName,
                    Grade = gradeDto.Grade,
                    ExamId = gradeDto.ExamId
                };

                _context.Grades.Add(grade);
                await _context.SaveChangesAsync();

                return CreatedAtAction(nameof(GetGradesByStudent), new { studentId = grade.StudentId }, grade);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error saving grade for StudentId: {StudentId}, ExamId: {ExamId}", gradeDto.StudentId, gradeDto.ExamId);
                return StatusCode(500, new { message = "Error saving grade.", error = ex.Message });
            }
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateGrade(int id, [FromBody] GradesUpdateDTO updatedGradeDto)
        {
            if (updatedGradeDto == null || id != updatedGradeDto.GradeId)
                return BadRequest(new { message = "Invalid grade data." });

            try
            {
                var existingGrade = await _context.Grades.FindAsync(id);
                if (existingGrade == null)
                    return NotFound(new { message = "Grade not found." });

                // Validate ExamId exists
                var examExists = await _context.Exams.AnyAsync(e => e.ExamId == updatedGradeDto.ExamId);
                if (!examExists)
                    return BadRequest(new { message = $"Exam with ID {updatedGradeDto.ExamId} not found." });

                existingGrade.StudentId = updatedGradeDto.StudentId;
                existingGrade.CourseName = updatedGradeDto.CourseName;
                existingGrade.Grade = updatedGradeDto.Grade;
                existingGrade.ExamId = updatedGradeDto.ExamId;

                await _context.SaveChangesAsync();
                return Ok(new { message = "Grade updated successfully.", updatedGrade = existingGrade });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating grade with ID {GradeId}", id);
                return StatusCode(500, new { message = "Error updating grade.", error = ex.Message });
            }
        }

        [HttpDelete("{gradeId}")]
        public async Task<IActionResult> DeleteGrade(int gradeId)
        {
            try
            {
                var grade = await _context.Grades.FindAsync(gradeId);
                if (grade == null)
                    return NotFound(new { message = $"Grade with ID {gradeId} not found." });

                // Check for dependent appeals
                var hasAppeals = await _context.Appeals.AnyAsync(a => a.GradeId == gradeId);
                if (hasAppeals)
                    return BadRequest(new { message = $"Cannot delete grade with ID {gradeId} because it has associated appeals." });

                _context.Grades.Remove(grade);
                await _context.SaveChangesAsync();

                return NoContent();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting grade with ID {GradeId}", gradeId);
                return StatusCode(500, new { message = "Error deleting grade.", error = ex.Message });
            }
        }

        [HttpPost("{gradeId}/appeal")]
        public async Task<IActionResult> SubmitGradeAppeal(int gradeId, [FromBody] AppealRequest appealRequest)
        {
            if (appealRequest == null ||
                string.IsNullOrWhiteSpace(appealRequest.StudentId) ||
                string.IsNullOrWhiteSpace(appealRequest.MessageText))
            {
                return BadRequest(new { message = "Invalid appeal data." });
            }

            try
            {
                var grade = await _context.Grades
                    .Include(g => g.Exam)
                    .FirstOrDefaultAsync(g => g.GradeId == gradeId && g.StudentId.ToLower() == appealRequest.StudentId.ToLower());

                if (grade == null)
                    return NotFound(new { message = "Grade not found." });

                var classExam = await _context.ClassExams.FirstOrDefaultAsync(ce => ce.ExamId == grade.ExamId);
                if (classExam == null)
                    return BadRequest(new { message = "No class associated with this exam." });

                var teacherEmail = await _context.Classes
                    .Where(c => c.Id == classExam.ClassId)
                    .Join(_context.Users,
                          c => c.TeacherEmail,
                          u => u.Email,
                          (c, u) => new { Class = c, User = u })
                    .Where(cu => cu.User.Role == "teacher")
                    .Select(cu => cu.User.Email)
                    .FirstOrDefaultAsync();

                if (string.IsNullOrWhiteSpace(teacherEmail))
                    return BadRequest(new { message = "No teacher associated with this class." });

                var appeal = new Appeal
                {
                    GradeId = gradeId,
                    StudentId = appealRequest.StudentId,
                    MessageText = appealRequest.MessageText,
                    ClassId = classExam.ClassId,
                    SubmittedAt = DateTime.UtcNow
                };

                _context.Appeals.Add(appeal);
                await _context.SaveChangesAsync();

                return Ok(new { message = "Appeal submitted successfully." });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error submitting appeal for GradeId: {GradeId}, StudentId: {StudentId}", gradeId, appealRequest.StudentId);
                return StatusCode(500, new { message = "Error submitting appeal.", error = ex.Message });
            }
        }

        [HttpGet("teacher/{teacherEmail}/appeals")]
        public async Task<IActionResult> GetGradeAppeals(string teacherEmail)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(teacherEmail))
                {
                    return BadRequest(new { message = "Teacher email is required." });
                }

                var teacher = await _context.Users
                    .FirstOrDefaultAsync(u => u.Email == teacherEmail && u.Role == "teacher");

                if (teacher == null)
                {
                    return NotFound(new { message = "Teacher not found." });
                }

                var appealsQuery = from appeal in _context.Appeals
                                   join cls in _context.Classes on appeal.ClassId equals cls.Id
                                   where cls.TeacherEmail.ToLower() == teacherEmail.ToLower()
                                   join grade in _context.Grades on appeal.GradeId equals grade.GradeId
                                   join exam in _context.Exams on grade.ExamId equals exam.ExamId
                                   join student in _context.Users on appeal.StudentId equals student.StudentId
                                   select new AppealResponse
                                   {
                                       Id = appeal.AppealId.ToString(),
                                       StudentId = appeal.StudentId,
                                       TeacherEmail = teacherEmail,
                                       MessageText = appeal.MessageText,
                                       SentAt = appeal.SubmittedAt,
                                       CourseName = cls.CourseName,
                                       SenderName = student.FullName ?? "Unknown",
                                       GradeId = grade.GradeId,
                                       ExamTitle = exam.Title
                                   };

                var appeals = await appealsQuery.ToListAsync();

                if (!appeals.Any())
                {
                    return NotFound(new { message = "No appeals found." });
                }

                return Ok(appeals);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving appeals for teacher {TeacherEmail}", teacherEmail);
                return StatusCode(500, new
                {
                    message = "Internal server error.",
                    error = ex.Message,
                    stackTrace = ex.StackTrace
                });
            }
        }

        [HttpPost("feedback")]
        public async Task<IActionResult> AddFeedback([FromBody] FeedbackCreateDTO feedbackDto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            try
            {
                var gradeExists = await _context.Grades.AnyAsync(g => g.GradeId == feedbackDto.GradeId);
                if (!gradeExists)
                    return NotFound(new { message = "Grade not found." });

                var feedback = new Feedback
                {
                    GradeId = feedbackDto.GradeId,
                    TeacherEmail = feedbackDto.TeacherEmail,
                    FeedbackText = feedbackDto.FeedbackText
                };

                _context.Feedbacks.Add(feedback);
                await _context.SaveChangesAsync();

                return Ok(new { message = "Feedback submitted successfully.", feedbackId = feedback.FeedbackId });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error submitting feedback for GradeId {GradeId}", feedbackDto.GradeId);
                return StatusCode(500, new { message = "Internal server error.", error = ex.Message });
            }
        }



        [HttpGet("feedback/student/{studentId}")]
        public async Task<IActionResult> GetFeedbackByStudent(string studentId)
        {
            try
            {
                var feedbacks = await _context.Feedbacks
                    .Include(f => f.Grade)
                    .Where(f => f.Grade.StudentId.ToLower() == studentId.ToLower())
                    .Select(f => new FeedbackResponseDTO
                    {
                        FeedbackId = f.FeedbackId,
                        GradeId = f.GradeId,
                        TeacherEmail = f.TeacherEmail,
                        FeedbackText = f.FeedbackText,
                        CreatedAt = f.CreatedAt
                    })
                    .ToListAsync();

                return Ok(feedbacks);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving feedback for student {StudentId}", studentId);
                return StatusCode(500, new { message = "Internal server error.", error = ex.Message });
            }
        }

        [HttpGet("feedback/grade/{gradeId}")]
        public async Task<IActionResult> GetFeedbackByGrade(int gradeId)
        {
            try
            {
                var feedbacks = await _context.Feedbacks
                    .Where(f => f.GradeId == gradeId)
                    .Select(f => new FeedbackResponseDTO
                    {
                        FeedbackId = f.FeedbackId,
                        GradeId = f.GradeId,
                        TeacherEmail = f.TeacherEmail,
                        FeedbackText = f.FeedbackText,
                        CreatedAt = f.CreatedAt
                    })
                    .ToListAsync();

                return Ok(feedbacks);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving feedback for grade {GradeId}", gradeId);
                return StatusCode(500, new { message = "Internal server error.", error = ex.Message });
            }
        }


    }

    public class GradesCreateDTO
    {
        [Required]
        public string StudentId { get; set; } = string.Empty;

        [Required]
        public string CourseName { get; set; } = string.Empty;

        [Required]
        [Range(0, 100)]
        public int Grade { get; set; }

        [Required]
        public int ExamId { get; set; }
    }

    public class GradesUpdateDTO
    {
        [Required]
        public int GradeId { get; set; }

        [Required]
        public string StudentId { get; set; } = string.Empty;

        [Required]
        public string CourseName { get; set; } = string.Empty;

        [Required]
        [Range(0, 100)]
        public int Grade { get; set; }

        [Required]
        public int ExamId { get; set; }
    }

    public class AppealRequest
    {
        [Required]
        public string StudentId { get; set; } = string.Empty;

        [Required]
        public string MessageText { get; set; } = string.Empty;
    }

    public class AppealResponse
    {
        public string Id { get; set; } = string.Empty;
        public string StudentId { get; set; } = string.Empty;
        public string TeacherEmail { get; set; } = string.Empty;
        public string MessageText { get; set; } = string.Empty;
        public DateTime SentAt { get; set; }
        public string CourseName { get; set; } = string.Empty;
        public string SenderName { get; set; } = string.Empty;
        public int GradeId { get; set; }
        public string ExamTitle { get; set; } = string.Empty;
    }

    public class FeedbackCreateDTO
    {
        [Required]
        public int GradeId { get; set; }

        [Required]
        [EmailAddress]
        public string TeacherEmail { get; set; }

        [Required]
        public string FeedbackText { get; set; }
    }

    public class FeedbackResponseDTO
    {
        public int FeedbackId { get; set; }
        public int GradeId { get; set; }
        public string TeacherEmail { get; set; }
        public string FeedbackText { get; set; }
        public DateTime CreatedAt { get; set; }
    }

}