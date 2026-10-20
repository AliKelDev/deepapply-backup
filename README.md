# DeepApply

**AI-Powered Job Application Assistant**

A modern web application that streamlines the job application process by leveraging AI to generate tailored cover letters, optimize CVs, and deliver strategic insights across keywords, culture, and interview prep.


## Features

### Profile Management
- **AI Profile Extraction**: Upload your CV or paste your LinkedIn profile—AI extracts and structures all your information automatically
- **Local Storage**: Save your profile once in browser localStorage and reuse it for every application
- **Smart Profile Builder**: Structured form for work experience, education, skills, certifications, and additional information
- **One-Time Setup**: Create your profile once, apply to unlimited jobs without re-entering data

### AI-Powered Generation
- **Cover Letters**: Generate role-specific cover letters that match company tone and requirements
- **CV HTML**: Receive a fully formatted, professionally styled CV optimized for each job
- **Strategic Insights**: Get key keywords, culture fit analysis, and suggested interview questions
- **Fit Rating**: An honest 0-100 match score with a strong fit / reach / pass call, evidence-backed strengths, specific gaps, and matched vs missing keywords
- **Mock Interview Coach**: Practice live against a DeepSeek-powered coach that scores each answer and suggests improvements

### Accounts & Sync (Google sign-in)
- **Sign in with Google**: One click, no password. Your profile, tracker, and recent generations sync across devices
- **Free monthly allowance**: Signed-in users get a per-month generation quota (default 10); a paid tier can lift it later
- **Local-first**: Everything still works in the browser; sync merges local and cloud copies on sign-in
- **Optional**: Without `GOOGLE_CLIENT_ID` configured the app runs anonymously, exactly as before

### Application Tracker
- **Automatic capture**: Every generated application becomes a tracker record (company, role, location, fit score) with no extra input
- **Pipeline**: Saved → Applied → Interviewing → Offer, or Rejected, with a status history
- **Follow-ups & notes**: Set a follow-up date (due items sort first) and keep private notes per application
- **Back to materials**: Reopen the generated cover letter, CV, and insights from any record while they are still cached
- **Local only**: Lives in your browser's localStorage, like your profile

### Content Export & Management
- **Edit Everything**: Rewrite the cover letter inline and edit the CV directly in its preview; edits are saved with the application (and synced when signed in), and the AI's original is one click away
- **Instant CV Rendering**: CV HTML renders directly in the browser with full styling control
- **Client-Side PDF Export**: Download multi-page PDFs generated locally via html2canvas + jsPDF
- **Copy to Clipboard**: One-click copying for cover letters and strategic insights

## Quick Start

```bash
# Clone the repository
git clone <repository-url>
cd DeepApply

# Install dependencies
npm install

# Start development server (frontend only)
npm run dev

# Or run frontend + Netlify functions together (recommended; pulls env from the linked Netlify site)
npx netlify dev

# Build for production
npm run build
```

The application will be available at `http://localhost:5173` (or another port if 5173 is in use).

## Tech Stack

- **Framework**: React 18 + Vite 6
- **Routing**: React Router DOM 7
- **Styling**: Tailwind CSS 3.4 with custom obsidian design system
- **Animations**: Framer Motion 11
- **Icons**: Lucide React

## Project Structure

```
DeepApply/
├── src/
│   ├── components/
│   │   ├── Layout/
│   │   │   └── MainLayout.jsx         # Main app wrapper
│   │   ├── Navigation/
│   │   │   ├── Navbar.jsx             # Top navigation bar
│   │   │   └── Footer.jsx             # Site footer
│   │   ├── UI/
│   │   │   ├── ActionButtons.jsx      # Copy/download buttons
│   │   │   ├── Header.jsx             # Page header component
│   │   │   ├── InstallGuide.jsx       # Installation instructions
│   │   │   └── PreviewEmbed.jsx       # Content preview
│   │   ├── Projects/
│   │   │   ├── ProjectCard.jsx        # Project display card
│   │   │   ├── ProjectList.jsx        # Project listing
│   │   │   └── TechCard.jsx           # Technology badge card
│   │   └── ScrollToTop.jsx            # Auto-scroll on navigation
│   ├── pages/
│   │   ├── HomePage.jsx               # Landing + application form
│   │   ├── ProfilePage.jsx            # Profile management with AI extraction
│   │   ├── ResultsPage.jsx            # Generated content display
│   │   ├── HowItWorksPage.jsx         # Product explanation
│   │   ├── PrivacyPolicyPage.jsx      # Privacy policy
│   │   ├── TermsOfServicePage.jsx     # Terms of service
│   │   └── ContactPage.jsx            # Contact information
│   ├── utils/
│   │   └── profileFormatter.js        # Profile data formatting utilities
│   ├── styles/
│   │   └── animations.js              # Animation configurations
│   ├── App.jsx                        # Main app component with routes
│   ├── main.jsx                       # React entry point
│   └── index.css                      # Global styles + Tailwind imports
├── netlify/functions/
│   ├── generate-application.cjs       # Cover letter & CV generation
│   └── extract-profile.cjs            # AI profile extraction from CV/text
├── tailwind.config.js                 # Custom design system config
├── vite.config.js                     # Vite build config
├── postcss.config.js                  # PostCSS configuration
└── package.json
```

## Usage Guide

### Option 1: Quick Apply with Saved Profile (Recommended)

**First Time Setup:**
1. Navigate to the Profile page via the navbar
2. Upload your CV or paste your LinkedIn profile text
3. Click "Extract Profile with AI"
4. Review the automatically populated fields
5. Make any necessary adjustments
6. Click "Save Profile"

**Every Application After:**
1. On the home page, click "Use Profile" when prompted
2. Paste the job description
3. Click "Generate Application"
4. Review your tailored materials and download

### Option 2: One-Time Application

From the home page:
1. Paste your profile information or upload a CV (TXT, PDF, DOCX)
2. Paste the full job description
3. Click "Generate Application"

### AI Generation Process

The system makes two types of AI calls:

**Profile Extraction** (extract-profile function):
- Analyzes your CV or profile text
- Returns structured JSON with all profile fields
- Used to populate the Profile page automatically

**Application Generation** (generate-application function):
- Takes your profile and job description
- Returns coverLetter, cvHtml (fully styled), and strategicInsights (keywords, culture fit, interview questions)

## Backend Integration

### Netlify Functions

The application uses two serverless functions:

**1. generate-application.cjs**
- Handles multipart form uploads
- Extracts text from PDF/DOCX files
- Calls Gemini API (gemini-2.5-flash-lite) with profile and job description
- Returns JSON with coverLetter, cvHtml, and strategicInsights
- Includes retry logic for rate limiting and service errors

**2. extract-profile.cjs**
- Accepts CV files or raw text input
- Uses Gemini to extract structured profile data
- Returns JSON matching the profile schema
- Powers the AI extraction feature on the Profile page

### API Key

Set a single environment variable:

```
GEMINI_API_KEY
```

### Deployment

To deploy, ensure your Netlify site has the API keys configured:
- Go to Site Settings > Environment Variables
- Add `GEMINI_API_KEY`

## Roadmap

**Completed Features**
- AI profile extraction and localStorage persistence
- Cover letter, CV, and strategic insights generation
- Client-side PDF export
- Profile management with quick apply

**Next**
- [ ] Application history and tracking
- [ ] Multiple saved profiles (personal, academic, etc.)
- [ ] A/B testing for cover letters
- [ ] Custom CV templates
- [ ] User authentication (optional cloud sync)
- [ ] Company research automation
- [ ] Email templates for outreach and follow-up

## Data Storage & Privacy

### Client-Side Storage
- Profile data is saved in browser localStorage when using the Profile page
- No profile information is transmitted to or stored on servers
- Data persists across sessions until manually cleared
- Use the "Clear Profile" button to remove all saved data

### Server-Side Processing
- Job descriptions and application requests are processed in-memory only
- No persistent storage of user inputs or generated content
- Session data is discarded after processing
- Netlify logs exclude submitted text content

### Third-Party Services
- Google Gemini API receives profile and job description text for generation
- See Privacy Policy page for complete data handling details

## Development

### Available Scripts

```bash
npm run dev        # Start dev server
npm run build      # Build for production
npm run preview    # Preview production build
npm run lint       # Run ESLint
npm run deploy     # Build and deploy to Netlify
```

### Environment Setup

1. Get your Gemini API key from [Google AI Studio](https://makersuite.google.com/app/apikey)

2. For local development:
```bash
# Install Netlify CLI
npm install -g netlify-cli

# Create .env file
echo "GEMINI_API_KEY=your_key_here" > .env

# Run with functions
netlify dev
```

3. For deployment, add `GEMINI_API_KEY` in Netlify dashboard under Site Settings > Environment Variables

## License

MIT License - see [LICENSE](LICENSE) file for details.
