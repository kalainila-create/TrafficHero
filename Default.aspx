<%@ Page Language="C#" AutoEventWireup="true" CodeFile="Default.aspx.cs" Inherits="_Default" %>
<!DOCTYPE html>
<html>
<head runat="server">
    <title>Traffic Hero</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@600;800&family=Nunito:wght@400;700;800&display=swap" rel="stylesheet" />
    <link rel="stylesheet" href="Styles/Site.css" />
</head>
<body>
    <form id="form1" runat="server">
        <div class="sky-bg">
            <div class="panel home-panel">
                <h1 class="logo">TRAFFIC<span>HERO</span></h1>
                <p class="tagline">Learn Traffic Rules. Be a Real Hero.</p>
                <p class="tagline" id="welcomeLine" runat="server"></p>

                <asp:LinkButton ID="btnStart" runat="server" CssClass="menu-btn btn-start"
                    OnClick="btnStart_Click">&#9654; START GAME</asp:LinkButton>

                <asp:LinkButton ID="btnRules" runat="server" CssClass="menu-btn btn-blue"
                    OnClick="btnRules_Click">RULES</asp:LinkButton>

                <asp:LinkButton ID="btnExit" runat="server" CssClass="menu-btn btn-blue"
                    OnClientClick="if(confirm('Exit Traffic Hero?')){ window.close(); } return false;">EXIT</asp:LinkButton>

                <asp:LinkButton ID="btnLogout" runat="server" CssClass="menu-btn btn-blue"
                    OnClick="btnLogout_Click">LOG OUT</asp:LinkButton>
            </div>
        </div>
    </form>
</body>
</html>
