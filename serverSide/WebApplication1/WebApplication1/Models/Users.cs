using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Configuration;
using System.ComponentModel.DataAnnotations;
using System.Security.Cryptography;
using System.Text;

namespace WebApplication1.Models
{
    public class AppUser
    {
        #region Properties
        [Key] public int Id { get; set; }

        [Required, StringLength(100)]
        public string FullName { get; set; } = string.Empty;

        [Required, StringLength(100)]
        public string Email { get; set; } = string.Empty;

        [Required, StringLength(100)]
        public string Password { get; set; } = string.Empty;

        [Required, StringLength(20)]
        public string Role { get; set; } = string.Empty;

        public string? StudentId { get; set; }
        public string? PhoneNumber { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        #endregion

        #region Database Operations
        private static string GetConnectionString()
        {
            return new SqlConnectionStringBuilder
            {
                ConnectionString = "workstation id=smartExamDB.mssql.somee.com;packet size=4096;user id=moslem20_SQLLogin_1;pwd=3szyexdqk2;data source=smartExamDB.mssql.somee.com;persist security info=False;initial catalog=smartExamDB;TrustServerCertificate=True",
            }.ToString();
        }

        public static string GetPublicConnectionString() => GetConnectionString();

        private static void AddRegistrationParameters(SqlCommand command, AppUser user)
        {
            command.Parameters.AddWithValue("@FullName", user.FullName);
            command.Parameters.AddWithValue("@Email", user.Email);
            command.Parameters.AddWithValue("@Password", user.Password);
            command.Parameters.AddWithValue("@Role", user.Role);

            // StudentId and PhoneNumber can be NULL
            command.Parameters.AddWithValue("@StudentId", (object?)user.StudentId ?? DBNull.Value);
            command.Parameters.AddWithValue("@PhoneNumber", (object?)user.PhoneNumber ?? DBNull.Value);
        }


        public static (bool success, string error) Register(AppUser newUser)
        {
            try
            {
                newUser.Email = newUser.Email.ToLower().Trim(); // Normalize email
                                                                // No hashing, password stays plain text
                using var connection = new SqlConnection(GetConnectionString());
                const string query = @"
                INSERT INTO Users 
                (FullName, Email, Password, Role, StudentId, PhoneNumber) 
                VALUES 
                (@FullName, @Email, @Password, @Role, @StudentId, @PhoneNumber);
                SELECT SCOPE_IDENTITY();";

                using var command = new SqlCommand(query, connection);
                AddRegistrationParameters(command, newUser);

                connection.Open();
                var newId = command.ExecuteScalar();
                return (newId != null, newId != null ? "" : "No rows affected");
            }
            catch (SqlException ex) when (ex.Number == 2627)
            {
                return (false, "Email already exists");
            }
            catch (Exception ex)
            {
                return (false, $"Error: {ex.Message}");
            }
        }

        public static bool EmailExists(string email)
        {
            using var connection = new SqlConnection(GetConnectionString());
            using var command = new SqlCommand("SELECT 1 FROM Users WHERE Email = @Email", connection);

            command.Parameters.AddWithValue("@Email", email.ToLower().Trim());
            connection.Open();
            return command.ExecuteScalar() != null;
        }

        public static AppUser? GetByEmail(string email,IConfiguration configuration)
        {
            Console.WriteLine($"Starting GetByEmail for: {email}");
            string connectionString = configuration.GetConnectionString("DefaultConnection");
            Console.WriteLine($"Connection String: {connectionString}");

            using var connection = new SqlConnection(connectionString);
            try
            {
                connection.Open();
                Console.WriteLine($"Connected to database: {connection.Database}");

                // Step 1: Check if the email exists
                string checkQuery = "SELECT COUNT(*) FROM Users WHERE Email = @Email";
                using var checkCommand = new SqlCommand(checkQuery, connection);
                checkCommand.Parameters.AddWithValue("@Email", email.ToLower().Trim());
                int count = (int)checkCommand.ExecuteScalar();
                Console.WriteLine($"Email count: {count} for {email.ToLower().Trim()}");

                if (count == 0)
                {
                    Console.WriteLine($"No user found for email: {email}");
                    return null;
                }

                // Step 2: Fetch the user data
                string fetchQuery = "SELECT * " +
                                   "FROM Users WHERE Email = @Email";
                using var fetchCommand = new SqlCommand(fetchQuery, connection);
                fetchCommand.Parameters.AddWithValue("@Email", email.ToLower().Trim());

                using var adapter = new SqlDataAdapter(fetchCommand);
                var table = new System.Data.DataTable();
                adapter.Fill(table);

                if (table.Rows.Count == 0)
                {
                    Console.WriteLine("No rows returned, unexpected error");
                    return null;
                }

                var row = table.Rows[0];
                var user = new AppUser
                {
                    FullName = row["FullName"].ToString() ?? "",
                    Email = row["Email"].ToString() ?? "",
                    Password = row["Password"].ToString() ?? "",
                    Role = row["Role"].ToString() ?? "",
                    StudentId = row["StudentId"] == DBNull.Value ? null : row["StudentId"].ToString(),
                    PhoneNumber = row["PhoneNumber"] == DBNull.Value ? null : row["PhoneNumber"].ToString(),
                };

                Console.WriteLine($"User retrieved: {user.Email}");
                return user;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in GetByEmail: {ex.Message}");
                return null;
            }
            finally
            {
                if (connection.State != System.Data.ConnectionState.Closed)
                    connection.Close();
            }
        }


        private static AppUser MapUserFromReader(SqlDataReader reader)
        {
            return new AppUser
            {
               // Id = reader.GetInt32(0),
                FullName = reader.GetString(1),
                Email = reader.GetString(2),
                Password = reader.GetString(3),
                Role = reader.GetString(4),
                StudentId = reader.IsDBNull(5) ? null : reader.GetString(5),
                PhoneNumber = reader.IsDBNull(6) ? null : reader.GetString(6),
              //  CreatedAt = reader.GetDateTime(7)
            };
        }

        public static bool VerifyPassword(string hashedPassword, string inputPassword)
        {
            return inputPassword == hashedPassword;
        }

        public static string HashPassword(string password)
        {
            using var sha256 = SHA256.Create();
            return BitConverter.ToString(sha256.ComputeHash(Encoding.UTF8.GetBytes(password))).Replace("-", "").ToLower();
        }

        public static (bool success, string? error) UpdateStudentProfile(AppUser user)
        {
            try
            {
                using var conn = new SqlConnection(GetPublicConnectionString());
                conn.Open();

                var query = "UPDATE Users SET FullName = @FullName, PhoneNumber = @PhoneNumber WHERE Email = @Email AND Role = 'student'";
                using var cmd = new SqlCommand(query, conn);
                cmd.Parameters.AddWithValue("@FullName", user.FullName);
                cmd.Parameters.AddWithValue("@PhoneNumber", user.PhoneNumber ?? (object)DBNull.Value);
                cmd.Parameters.AddWithValue("@Email", user.Email);

                var rowsAffected = cmd.ExecuteNonQuery();
                return (rowsAffected > 0, rowsAffected > 0 ? null : "No changes were made.");
            }
            catch (Exception ex)
            {
                return (false, ex.Message);
            }
        }


        public static (bool Success, string? Error) Update(AppUser user)
        {
            try
            {
                using var connection = new SqlConnection(GetPublicConnectionString());
                connection.Open();

                var query = @"UPDATE Users 
                      SET FullName = @FullName,
                          Password = @Password,
                          PhoneNumber = @PhoneNumber
                      WHERE Email = @Email";

                using var command = new SqlCommand(query, connection);
                command.Parameters.AddWithValue("@FullName", user.FullName ?? "");
                command.Parameters.AddWithValue("@Password", user.Password ?? "");
                command.Parameters.AddWithValue("@PhoneNumber", user.PhoneNumber ?? "");
                command.Parameters.AddWithValue("@Email", user.Email ?? "");

                int rows = command.ExecuteNonQuery();
                return (rows > 0, rows > 0 ? null : "No rows affected.");
            }
            catch (Exception ex)
            {
                return (false, ex.Message);
            }
        }


        #endregion
    }
}
