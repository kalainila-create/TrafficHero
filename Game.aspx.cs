using System;
using System.Data;
using System.Data.SqlClient;

public partial class Game : System.Web.UI.Page
{
    protected void Page_Load(object sender, EventArgs e)
    {
        if (Session["LoggedIn"] == null)
        {
            Response.Redirect("Login.aspx");
            return;
        }

        if (!IsPostBack)
        {
            if (Session["BestScore"] == null)
            {
                Session["BestScore"] = 0;
            }
            lblBestScore.Text = Session["BestScore"].ToString();
            BindLeaderboard();
        }
    }

   
    protected void btnSaveScore_Click(object sender, EventArgs e)
    {
        int finalScore;
        if (!int.TryParse(hfFinalScore.Value, out finalScore))
        {
            finalScore = 0;
        }

        int best = Convert.ToInt32(Session["BestScore"]);
        if (finalScore > best)
        {
            best = finalScore;
            Session["BestScore"] = best;

            using (SqlConnection conn = Auth.GetConnection())
            {
                var cmd = new SqlCommand(
                    "UPDATE Users SET BestScore = @s WHERE Username = @u", conn);
                cmd.Parameters.AddWithValue("@s", best);
                cmd.Parameters.AddWithValue("@u", Session["Username"].ToString());
                conn.Open();
                cmd.ExecuteNonQuery();
            }
        }

        lblFinalScore.Text = finalScore.ToString();
        lblBestScore.Text = best.ToString();
        BindLeaderboard();
    }

    // Top 5 scores across every account — a shared expo leaderboard.
    private void BindLeaderboard()
    {
        using (SqlConnection conn = Auth.GetConnection())
        {
            var cmd = new SqlCommand(
                "SELECT TOP 5 Username, BestScore FROM Users WHERE BestScore > 0 ORDER BY BestScore DESC", conn);
            var adapter = new SqlDataAdapter(cmd);
            var table = new DataTable();
            adapter.Fill(table);

            rptLeaderboard.DataSource = table;
            rptLeaderboard.DataBind();
        }
    }
}
