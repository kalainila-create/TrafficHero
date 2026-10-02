using System;
using System.Data.SqlClient;

public partial class Register : System.Web.UI.Page
{
    protected void btnRegister_Click(object sender, EventArgs e)
    {
        string username = txtUsername.Text.Trim();
        string password = txtPassword.Text;

        if (username.Length < 3)
        {
            ShowError("Username must be at least 3 characters.");
            return;
        }
        if (password.Length < 6)
        {
            ShowError("Password must be at least 6 characters.");
            return;
        }
        if (password != txtConfirm.Text)
        {
            ShowError("Passwords do not match.");
            return;
        }

        using (SqlConnection conn = Auth.GetConnection())
        {
            conn.Open();

            var checkCmd = new SqlCommand("SELECT COUNT(*) FROM Users WHERE Username = @u", conn);
            checkCmd.Parameters.AddWithValue("@u", username);
            int existing = (int)checkCmd.ExecuteScalar();

            if (existing > 0)
            {
                ShowError("That username is already taken.");
                return;
            }

            var insertCmd = new SqlCommand(
                "INSERT INTO Users (Username, PasswordHash) VALUES (@u, @p)", conn);
            insertCmd.Parameters.AddWithValue("@u", username);
            insertCmd.Parameters.AddWithValue("@p", Auth.HashPassword(password));
            insertCmd.ExecuteNonQuery();
        }

        Response.Redirect("Login.aspx");
    }

    private void ShowError(string message)
    {
        lblError.Text = message;
        lblError.Visible = true;
    }
}
