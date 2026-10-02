using System;
using System.Data.SqlClient;

public partial class Login : System.Web.UI.Page
{
    protected void btnLogin_Click(object sender, EventArgs e)
    {
        string username = txtUsername.Text.Trim();
        string passwordHash = Auth.HashPassword(txtPassword.Text);

        using (SqlConnection conn = Auth.GetConnection())
        {
            var cmd = new SqlCommand(
                "SELECT BestScore FROM Users WHERE Username = @u AND PasswordHash = @p",
                conn);
            cmd.Parameters.AddWithValue("@u", username);
            cmd.Parameters.AddWithValue("@p", passwordHash);

            conn.Open();
            object result = cmd.ExecuteScalar();

            if (result != null)
            {
                Session["LoggedIn"] = true;
                Session["Username"] = username;
                Session["BestScore"] = Convert.ToInt32(result);
                Response.Redirect("Default.aspx");
            }
            else
            {
                lblError.Text = "Incorrect username or password.";
                lblError.Visible = true;
            }
        }
    }
}
