import Link from "next/link";
import "./globals.css";

export default function Home() {
  return (
    <main className="site">
      <div className="background">
        <div className="grid" />
        <div className="orb orbOne" />
        <div className="orb orbTwo" />
        <div className="orb orbThree" />
        <div className="scanline" />
      </div>

      {/* NAVIGATION */}
      <header className="navbar">
        <div className="navInner">
          <Link href="/" className="logo">
            <span className="logoMark">
              <span />
              <span />
              <span />
            </span>

            <span className="logoText">
              INVEST<span>MENT</span>
            </span>
          </Link>

          <nav className="navLinks">
            <Link href="/" className="active">
              Home
            </Link>

            <a href="#features">Features</a>
            <a href="#security">Security</a>
            <a href="#how-it-works">How It Works</a>
          </nav>

          <div className="navActions">
            <Link href="/login" className="loginButton">
              Login
            </Link>

            <Link href="/signup" className="navSignup">
              Get Started
              <span>↗</span>
            </Link>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="hero">
        <div className="heroContent">
          <div className="eyebrow">
            <span className="statusDot" />
            NEXT-GENERATION INVESTMENT PLATFORM
          </div>

          <h1>
            Build Your
            <br />
            <span className="gradientText">Financial Future.</span>
          </h1>

          <p className="heroDescription">
            A modern digital investment experience designed to give investors
            powerful tools, transparent information, and secure access to
            their investment journey.
          </p>

          <div className="heroActions">
            <Link href="/signup" className="primaryButton">
              <span>Start Investing</span>
              <span className="arrow">→</span>
            </Link>

            <Link href="/dashboard" className="secondaryButton">
              Explore Platform
              <span>↗</span>
            </Link>
          </div>

          <div className="heroTrust">
            <div className="trustItem">
              <strong>24/7</strong>
              <span>Platform Access</span>
            </div>

            <div className="trustDivider" />

            <div className="trustItem">
              <strong>Secure</strong>
              <span>Investor Portal</span>
            </div>

            <div className="trustDivider" />

            <div className="trustItem">
              <strong>Digital</strong>
              <span>Account Management</span>
            </div>
          </div>
        </div>

        {/* 3D VISUAL */}
        <div className="heroVisual">
          <div className="visualGlow" />

          <div className="orbit orbitA" />
          <div className="orbit orbitB" />
          <div className="orbit orbitC" />

          <div className="dashboardCard">
            <div className="cardTop">
              <div>
                <span className="smallLabel">PORTFOLIO VALUE</span>

                <div className="portfolioValue">
                  $128,450<span>.00</span>
                </div>
              </div>

              <div className="cardIcon">↗</div>
            </div>

            <div className="chart">
              <div className="chartLine">
                <span className="point p1" />
                <span className="point p2" />
                <span className="point p3" />
                <span className="point p4" />
                <span className="point p5" />
                <span className="point p6" />
              </div>
            </div>

            <div className="cardBottom">
              <div>
                <span>PERFORMANCE</span>
                <strong className="positive">+18.42%</strong>
              </div>

              <div>
                <span>STATUS</span>

                <strong className="verified">
                  <i />
                  Active
                </strong>
              </div>
            </div>
          </div>

          <div className="floatingCard floatingOne">
            <div className="floatingIcon">₿</div>

            <div>
              <span>Digital Assets</span>
              <strong>Portfolio</strong>
            </div>
          </div>

          <div className="floatingCard floatingTwo">
            <div className="shield">✓</div>

            <div>
              <span>Account</span>
              <strong>Protected</strong>
            </div>
          </div>

          <div className="floatingNumber">
            <span>+</span>18.42%
          </div>
        </div>
      </section>

      {/* TICKER */}
      <div className="ticker">
        <div className="tickerTrack">
          <span>● DIGITAL INVESTMENT</span>
          <span>SECURE PORTAL</span>
          <span>● REAL-TIME ACCESS</span>
          <span>INVESTOR MANAGEMENT</span>
          <span>● DIGITAL FINANCE</span>
          <span>SECURE PORTAL</span>
          <span>● DIGITAL INVESTMENT</span>
          <span>REAL-TIME ACCESS</span>
        </div>
      </div>

      {/* FEATURES */}
      <section id="features" className="section">
        <div className="sectionHeader">
          <div className="sectionTag">01 / PLATFORM</div>

          <h2>
            Everything You Need.
            <br />
            <span>One Powerful Platform.</span>
          </h2>

          <p>
            Access your investment environment through a clean, modern and
            intuitive digital experience.
          </p>
        </div>

        <div className="featureGrid">
          <div className="featureCard featureLarge">
            <div className="featureNumber">01</div>

            <div className="featureIcon">◈</div>

            <h3>Smart Portfolio Management</h3>

            <p>
              Keep your investment information organized through a centralized
              digital dashboard built for clarity and control.
            </p>

            <div className="featureVisual portfolioVisual">
              <div className="miniBar barOne" />
              <div className="miniBar barTwo" />
              <div className="miniBar barThree" />
              <div className="miniBar barFour" />
              <div className="miniBar barFive" />
            </div>
          </div>

          <div className="featureCard">
            <div className="featureNumber">02</div>

            <div className="featureIcon blueIcon">◉</div>

            <h3>Secure Account Access</h3>

            <p>
              Modern authentication and account verification tools help
              maintain a protected investor environment.
            </p>

            <div className="securityRing">
              <div>✓</div>
            </div>
          </div>

          <div className="featureCard">
            <div className="featureNumber">03</div>

            <div className="featureIcon goldIcon">◇</div>

            <h3>Transparent Information</h3>

            <p>
              Review relevant account and investment information from one
              convenient location.
            </p>

            <div className="dataLines">
              <span />
              <span />
              <span />
              <span />
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="processSection">
        <div className="sectionHeader center">
          <div className="sectionTag">02 / PROCESS</div>

          <h2>
            Start Your Journey
            <br />
            <span>In Three Steps.</span>
          </h2>
        </div>

        <div className="processGrid">
          <div className="processCard">
            <div className="processTop">
              <span>01</span>
              <div className="processLine" />
            </div>

            <div className="processIcon">◎</div>

            <h3>Create Your Account</h3>

            <p>
              Register your account and establish your secure investor
              profile.
            </p>
          </div>

          <div className="processCard">
            <div className="processTop">
              <span>02</span>
              <div className="processLine" />
            </div>

            <div className="processIcon">◇</div>

            <h3>Complete Verification</h3>

            <p>
              Complete the verification process to access the appropriate
              platform features.
            </p>
          </div>

          <div className="processCard">
            <div className="processTop">
              <span>03</span>
              <div className="processLine" />
            </div>

            <div className="processIcon">↗</div>

            <h3>Manage Your Investments</h3>

            <p>
              Access your dashboard and manage your investment information
              through the platform.
            </p>
          </div>
        </div>
      </section>

      {/* SECURITY */}
      <section id="security" className="securitySection">
        <div className="securityContent">
          <div className="sectionTag">03 / SECURITY</div>

          <h2>
            Designed Around
            <br />
            <span>Investor Security.</span>
          </h2>

          <p>
            Your account experience is built around secure access, identity
            verification and controlled investor functionality.
          </p>

          <div className="securityFeatures">
            <div>
              <span className="check">✓</span>
              <span>Secure authentication</span>
            </div>

            <div>
              <span className="check">✓</span>
              <span>Identity verification workflow</span>
            </div>

            <div>
              <span className="check">✓</span>
              <span>Protected investor dashboard</span>
            </div>

            <div>
              <span className="check">✓</span>
              <span>Controlled account access</span>
            </div>
          </div>

          <Link href="/signup" className="securityButton">
            Create Secure Account
            <span>→</span>
          </Link>
        </div>

        <div className="securityVisual">
          <div className="securityCube">
            <div className="cubeFace cubeFront">
              <div className="bigShield">✓</div>
              <span>SECURED</span>
            </div>

            <div className="cubeFace cubeRight" />
            <div className="cubeFace cubeTop" />
          </div>

          <div className="securityParticles">
            <span />
            <span />
            <span />
            <span />
            <span />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="ctaSection">
        <div className="ctaGlow" />

        <div className="ctaContent">
          <div className="sectionTag">READY WHEN YOU ARE</div>

          <h2>
            Your Financial
            <br />
            <span>Journey Starts Here.</span>
          </h2>

          <p>
            Create your account and experience a modern digital investment
            platform built around simplicity, access and security.
          </p>

          <div className="ctaActions">
            <Link href="/signup" className="primaryButton large">
              Create Account
              <span className="arrow">→</span>
            </Link>

            <Link href="/login" className="secondaryButton large">
              Sign In
              <span>↗</span>
            </Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="footer">
        <div className="footerInner">
          <div className="footerBrand">
            <Link href="/" className="logo">
              <span className="logoMark">
                <span />
                <span />
                <span />
              </span>

              <span className="logoText">
                INVEST<span>MENT</span>
              </span>
            </Link>

            <p>
              A modern digital environment for managing your investment
              journey.
            </p>
          </div>

          <div className="footerLinks">
            <div>
              <span className="footerTitle">PLATFORM</span>

              <Link href="/dashboard">Dashboard</Link>
              <Link href="/signup">Create Account</Link>
              <Link href="/login">Login</Link>
            </div>

            <div>
              <span className="footerTitle">COMPANY</span>

              <a href="#features">Features</a>
              <a href="#security">Security</a>
              <a href="#how-it-works">How It Works</a>
            </div>
          </div>
        </div>

        <div className="footerBottom">
          <span>
            © {new Date().getFullYear()} Investment Platform
          </span>

          <span>
            Digital Finance • Secure Access
          </span>
        </div>
      </footer>
    </main>
  );
}