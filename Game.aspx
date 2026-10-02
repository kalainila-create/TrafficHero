<%@ Page Language="C#" AutoEventWireup="true" CodeFile="Game.aspx.cs" Inherits="Game" %>
<!DOCTYPE html>
<html>
<head runat="server">
    <title>Traffic Hero - Gameplay</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@600;800&family=Nunito:wght@400;700;800&display=swap" rel="stylesheet" />
    <link rel="stylesheet" href="Styles/Site.css" />
</head>
<body>
    <form id="form1" runat="server">
        <asp:ScriptManager ID="ScriptManager1" runat="server" />

        <div class="sky-bg">
            <div class="panel game-wrap">

                <div class="hud">
                    <div><span>&#11088;</span>SCORE: <span id="hudScore">0</span></div>
                    <div><span>&#127942;</span>LEVEL: <span id="hudLevel">1</span></div>
                    <div id="hudComboWrap"><span>&#128293;</span>COMBO: <span id="hudCombo">x1</span></div>
                    <div><span>&#128337;</span>TIME: <span id="hudTime">60</span></div>
                    <div id="hudLives"><span>&#10084;&#65039;</span>LIVES: <span id="hudLivesVal">4</span></div>
                    <button type="button" class="pause-btn" id="btnMusic" title="Music">&#127925;</button>
                    <button type="button" class="pause-btn" id="btnPause" title="Pause">&#10074;&#10074;</button>
                </div>

                <div class="stage">
                    <canvas id="gameCanvas" width="720" height="440"></canvas>

                    <div class="give-way-banner" id="giveWayBanner">GIVE WAY TO<br />AMBULANCE</div>
                    <div class="crossing-banner" id="crossingBanner">PEDESTRIAN<br />CROSSING - STOP</div>
                    <div class="red-light-banner" id="redLightBanner">&#128721; RED LIGHT<br />STOP NOW!</div>
                    <div class="level-banner" id="levelBanner">LEVEL 1!</div>
                    <div class="toast" id="toast"></div>

                    <div class="overlay" id="pauseOverlay">
                        <div class="overlay-card">
                            <h2 style="color:#ffd23f;">PAUSED</h2>
                            <div class="overlay-buttons">
                                <button type="button" id="btnResume" style="background:#27ae60;">&#9654; RESUME</button>
                            </div>
                        </div>
                    </div>

                    <!-- Game Over overlay: server labels are refreshed via an
                         async postback so the ASP.NET best-score is shown
                         without leaving this page. -->
                    <div class="overlay" id="gameOverOverlay">
                        <div class="overlay-card">
                            <h2>GAME OVER!</h2>
                            <div class="label">YOUR SCORE</div>

                            <asp:UpdatePanel ID="UpdatePanel1" runat="server">
                                <ContentTemplate>
                                    <div class="score"><asp:Label ID="lblFinalScore" runat="server" Text="0" /></div>
                                    <div class="stars" id="starsDisplay">&#9733;&#9733;&#9733;</div>
                                    <div class="best">Best Score: <asp:Label ID="lblBestScore" runat="server" Text="0" /></div>
                                    <asp:LinkButton ID="btnSaveScore" runat="server" OnClick="btnSaveScore_Click" style="display:none;" />

                                    <div class="leaderboard">
                                        <div class="lb-title">&#127942; TOP PLAYERS</div>
                                        <asp:Repeater ID="rptLeaderboard" runat="server">
                                            <ItemTemplate>
                                                <div class="lb-row">
                                                    <span><%# Container.ItemIndex + 1 %>. <%# Eval("Username") %></span>
                                                    <span><%# Eval("BestScore") %></span>
                                                </div>
                                            </ItemTemplate>
                                        </asp:Repeater>
                                    </div>
                                </ContentTemplate>
                                <Triggers>
                                    <asp:AsyncPostBackTrigger ControlID="btnSaveScore" EventName="Click" />
                                </Triggers>
                            </asp:UpdatePanel>

                            <div class="message" id="overlayMessage">Great Job! You are a Traffic Hero!</div>

                            <div class="overlay-buttons">
                                <button type="button" id="btnPlayAgain" style="background:#27ae60;">&#8635; PLAY AGAIN</button>
                                <a href="Default.aspx" style="background:#2d6cdf;">&#127968; HOME</a>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="pad">
                    <button type="button" class="pad-btn" id="padLeft">&#9664;</button>
                    <button type="button" class="pad-btn" id="padUp">&#9650;</button>
                    <button type="button" class="pad-btn" id="padDown">&#9660;</button>
                    <button type="button" class="pad-btn" id="padRight">&#9654;</button>
                </div>

                <p class="play-instructions">
                    &#9664;&#9654; Change lane &nbsp;|&nbsp; &#9650; Drive &nbsp;|&nbsp;
                    &#9660; Brake/Stop &nbsp;|&nbsp; Stop for red lights &amp; pedestrians &nbsp;|&nbsp;
                    &#10074;&#10074; Pause (P) &nbsp;|&nbsp; &#127925; Music
                </p>
            </div>
        </div>

        <asp:HiddenField ID="hfFinalScore" runat="server" ClientIDMode="Static" />

        <script type="text/javascript">
            // Values the server needs to hand to the client so game.js can
            // trigger the "save score" postback without hard-coding IDs.
            var THConfig = {
                saveScoreControlId: '<%= btnSaveScore.UniqueID %>',
                hiddenFieldId: 'hfFinalScore'
            };
        </script>
        <script src="Scripts/game.js"></script>
    </form>
</body>
</html>
