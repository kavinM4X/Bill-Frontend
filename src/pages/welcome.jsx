import React from 'react';
import { Link } from 'react-router-dom';
import '../css/welcome.css';

const Welcome = () => {
  return (
    <div className="welcome-container">
      <nav className="welcome-nav">
        <div className="logo">
          <span className="logo-text">Business Management System</span>
        </div>
        <div className="nav-links">
          <Link to="/login" className="nav-link">Login</Link>
          <Link to="/register" className="nav-link register-link">Sign Up</Link>
        </div>
      </nav>

      <div className="hero-section">
        <div className="hero-content">
          <h1 className="hero-title">Streamline Your Business Operations</h1>
          <p className="hero-subtitle">
            An all-in-one platform for invoicing, expense tracking, and business management
          </p>
          <div className="hero-cta">
            <Link to="/register" className="cta-button primary">Get Started</Link>
            <Link to="/login" className="cta-button secondary">Sign In</Link>
          </div>
        </div>
        <div className="hero-image">
          <div className="dashboard-preview"></div>
        </div>
      </div>

      <div className="features-section">
        <h2 className="section-title">Powerful Features for Your Business</h2>
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">
              <img src="/images/invoice-icon.svg" alt="Invoice Management" />
            </div>
            <h3>Invoice Management</h3>
            <p>Create professional invoices, track payments, and send automated reminders to clients</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">
              <img src="/images/expense-icon.svg" alt="Expense Tracking" />
            </div>
            <h3>Expense Tracking</h3>
            <p>Categorize expenses, upload receipts, and monitor your business spending in real-time</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">
              <img src="/images/report-icon.svg" alt="Financial Reports" />
            </div>
            <h3>Financial Reports</h3>
            <p>Generate comprehensive reports with visual charts to make informed business decisions</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">
              <img src="/images/order-icon.svg" alt="Order Management" />
            </div>
            <h3>Order Management</h3>
            <p>Streamline your purchase and sales order processes with automated workflows</p>
          </div>
        </div>
      </div>

      <div className="benefits-section">
        <div className="benefits-content">
          <h2 className="section-title">Why Choose Business Management System?</h2>
          <div className="benefits-grid">
            <div className="benefit-item">
              <div className="benefit-icon ui-icon"></div>
              <div className="benefit-text">
                <h3>Intuitive Interface</h3>
                <p>Clean, modern design that's easy to navigate and use</p>
              </div>
            </div>
            <div className="benefit-item">
              <div className="benefit-icon security-icon"></div>
              <div className="benefit-text">
                <h3>Data Security</h3>
                <p>Enterprise-grade security to protect your sensitive business information</p>
              </div>
            </div>
            <div className="benefit-item">
              <div className="benefit-icon realtime-icon"></div>
              <div className="benefit-text">
                <h3>Real-time Updates</h3>
                <p>Instant synchronization across all devices and team members</p>
              </div>
            </div>
            <div className="benefit-item">
              <div className="benefit-icon support-icon"></div>
              <div className="benefit-text">
                <h3>Dedicated Support</h3>
                <p>Our team is ready to assist you with any questions or issues</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="testimonials-section">
        <h2 className="section-title">What Our Clients Say</h2>
        <div className="testimonials-grid">
          <div className="testimonial-card">
            <div className="quote-mark">"</div>
            <p className="testimonial-text">BillWell has transformed how we manage our finances. The invoicing system is intuitive and the reporting features give us valuable insights into our business performance.</p>
            <div className="testimonial-author">
              <div className="author-avatar"></div>
              <div className="author-info">
                <h4>Rajesh Kumar</h4>
                <p>CEO, TechSolutions Inc.</p>
              </div>
            </div>
          </div>
          <div className="testimonial-card">
            <div className="quote-mark">"</div>
            <p className="testimonial-text">The expense tracking feature has saved us countless hours of manual work. We can now focus more on growing our business rather than administrative tasks.</p>
            <div className="testimonial-author">
              <div className="author-avatar"></div>
              <div className="author-info">
                <h4>Priya Sharma</h4>
                <p>Finance Director, Global Retail</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="cta-section">
        <h2>Ready to streamline your business operations?</h2>
        <p>Join thousands of businesses that trust BillWell for their financial management needs.</p>
        <Link to="/register" className="cta-button primary large">Get Started Today</Link>
      </div>

      <footer className="welcome-footer">
        <div className="footer-content">
          <div className="footer-logo">
            <span className="logo-text">BillWell</span>
            <p>Your Complete Business Management Solution</p>
          </div>
          <div className="footer-links">
            <div className="footer-column">
              <h3>Product</h3>
              <ul>
                <li><a href="#">Features</a></li>
                <li><a href="#">Pricing</a></li>
                <li><a href="#">Testimonials</a></li>
              </ul>
            </div>
            <div className="footer-column">
              <h3>Company</h3>
              <ul>
                <li><a href="#">About Us</a></li>
                <li><a href="#">Contact</a></li>
                <li><a href="#">Careers</a></li>
              </ul>
            </div>
            <div className="footer-column">
              <h3>Resources</h3>
              <ul>
                <li><a href="#">Blog</a></li>
                <li><a href="#">Help Center</a></li>
                <li><a href="#">Privacy Policy</a></li>
              </ul>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <p>&copy; {new Date().getFullYear()} Business Management System. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Welcome;