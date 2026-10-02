using System;

public partial class _Default : System.Web.UI.Page
{
    protected void Page_Load(object sender, EventArgs e)
    {
        if (Session["LoggedIn"] == null)
        {
            Response.Redirect("Login.aspx");
            return;
        }

        if (!IsPostBack && Session["Username"] != null)
        {
            welcomeLine.InnerText = "Welcome, " + Session["Username"] + "!";
        }
    }

    protected void btnStart_Click(object sender, EventArgs e)
    {
        Response.Redirect("Game.aspx");
    }

    protected void btnRules_Click(object sender, EventArgs e)
    {
        Response.Redirect("Rules.aspx");
    }

    protected void btnLogout_Click(object sender, EventArgs e)
    {
        Session["LoggedIn"] = null;
        Response.Redirect("Login.aspx");
    }
}
