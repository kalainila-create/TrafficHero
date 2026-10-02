<%@ Page Language="C#" AutoEventWireup="true" CodeFile="Rules.aspx.cs" Inherits="Rules" %>
<!DOCTYPE html>
<html>
<head runat="server">
    <title>Traffic Hero - Rules</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@600;800&family=Nunito:wght@400;700;800&display=swap" rel="stylesheet" />
    <link rel="stylesheet" href="Styles/Site.css" />
</head>
<body>
    <form id="form1" runat="server">
        <div class="sky-bg">
            <div class="panel rules-panel">
                <h1>TRAFFIC RULES</h1>

                <div class="rule-row">
                    <div class="rule-icon">&#128678;</div>
                    <div><strong>Obey Traffic Signals</strong><span>Follow the traffic light. Stop on red, go on green.</span></div>
                </div>

                <div class="rule-row">
                    <div class="rule-icon">&#128721;</div>
                    <div><strong>Stop at Red Signal</strong><span>Driving through a red light costs you a life instantly.</span></div>
                </div>

                <div class="rule-row">
                    <div class="rule-icon">&#128694;</div>
                    <div><strong>Use Zebra Crossing</strong><span>Cross the road safely at marked crossings.</span></div>
                </div>

                <div class="rule-row">
                    <div class="rule-icon">&#128245;</div>
                    <div><strong>Don't Use Mobile</strong><span>Avoid distractions while driving.</span></div>
                </div>

                <div class="rule-row">
                    <div class="rule-icon">&#128657;</div>
                    <div><strong>Give Way to Ambulance</strong><span>Move out of its lane, or you'll lose a big chunk of points.</span></div>
                </div>

                <h1 style="margin-top:26px;">GAME CONTROLS</h1>

                <div class="rule-row">
                    <div class="rule-icon">&#11104;&#65039;</div>
                    <div><strong>Left / Right or A / D</strong><span>Change lane</span></div>
                </div>

                <div class="rule-row">
                    <div class="rule-icon">&#11014;&#65039;</div>
                    <div><strong>Up / W (hold)</strong><span>Drive forward</span></div>
                </div>

                <div class="rule-row">
                    <div class="rule-icon">&#11015;&#65039;</div>
                    <div><strong>Down / S (hold)</strong><span>Brake / stop — use this to safely wait out a red light or a pedestrian crossing</span></div>
                </div>

                <div class="rule-row">
                    <div class="rule-icon">&#10074;&#10074;</div>
                    <div><strong>Pause button or P key</strong><span>Pause / resume the round</span></div>
                </div>

                <div class="rule-row">
                    <div class="rule-icon">&#127925;</div>
                    <div><strong>Music button</strong><span>Mute / unmute background music</span></div>
                </div>

                <div class="rule-row">
                    <div class="rule-icon">&#128072;</div>
                    <div><strong>On-screen &#9664;&#9650;&#9660;&#9654; buttons</strong><span>Same controls, for touch or mouse</span></div>
                </div>

                <asp:LinkButton ID="btnBack" runat="server" CssClass="back-btn" OnClick="btnBack_Click">&#8592; BACK TO HOME</asp:LinkButton>
            </div>
        </div>
    </form>
</body>
</html>
