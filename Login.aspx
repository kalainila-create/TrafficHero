<%@ Page Language="C#" AutoEventWireup="true" CodeFile="Login.aspx.cs" Inherits="Login" %>
<!DOCTYPE html>
<html>
<head runat="server">
    <title>Traffic Hero - Login</title>
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
                <p class="tagline">Sign in to play</p>

                <div class="login-field">
                    <asp:Label ID="lblUser" runat="server" AssociatedControlID="txtUsername">Username</asp:Label>
                    <asp:TextBox ID="txtUsername" runat="server" CssClass="login-input" />
                </div>

                <div class="login-field">
                    <asp:Label ID="lblPass" runat="server" AssociatedControlID="txtPassword">Password</asp:Label>
                    <asp:TextBox ID="txtPassword" runat="server" CssClass="login-input" TextMode="Password" />
                </div>

                <asp:Label ID="lblError" runat="server" CssClass="login-error" Visible="false" />

                <asp:LinkButton ID="btnLogin" runat="server" CssClass="menu-btn btn-start"
                    OnClick="btnLogin_Click">LOG IN</asp:LinkButton>

                <asp:HyperLink ID="lnkRegister" runat="server" CssClass="menu-btn btn-blue"
                    NavigateUrl="Register.aspx">NEW USER? REGISTER</asp:HyperLink>
            </div>
        </div>
    </form>
</body>
</html>
