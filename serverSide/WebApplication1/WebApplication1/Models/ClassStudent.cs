using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace WebApplication1.Models
{
    public class ClassStudent
    {
        [Key]
        [Column(Order = 0)]
        [Required]
        public string ClassId { get; set; }

        [Key]
        [Column(Order = 1)]
        [Required]
        public string StudentId { get; set; }

        [ForeignKey("ClassId")]
        public ClassModel Class { get; set; }

        [ForeignKey("StudentId")]
        public AppUser Student { get; set; }
    }
}