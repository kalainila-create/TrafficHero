using System;
using System.Configuration;
using System.Data.SqlClient;
using System.Security.Cryptography;
using System.Text;

public static class Auth
{
    public static string HashPassword(string password)
    {
        using (var sha = SHA256.Create())
        {
            byte[] bytes = sha.ComputeHash(Encoding.UTF8.GetBytes(password));
            return BitConverter.ToString(bytes).Replace("-", "");
        }
    }

    public static SqlConnection GetConnection()
    {
        string connStr = ConfigurationManager.ConnectionStrings["TrafficHeroDB"].ConnectionString;
        return new SqlConnection(connStr);
    }
}
