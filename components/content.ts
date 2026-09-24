// Single source of truth for all copy: zone panels, intro card, and the
// server-rendered fallback in pages/index.tsx all read from here.
// TODO(Ashutosh): add real, approved results to WORK.cases — empty results are hidden.

export const EMAIL = 'work.ashutoshpathak@gmail.com'
export const LINKEDIN = 'https://www.linkedin.com/in/ashutosh-pathak/'
// Drop a PDF at public/resume.pdf and set this to '/resume.pdf' to show the Résumé button.
export const RESUME_URL = ''

export const INTRO = {
  name: 'Ashutosh Pathak',
  role: 'Pharma & Healthcare Digital Marketing',
  greeting: 'Hi, I’m Ashutosh Pathak.',
  headline: 'I help pharma and healthcare brands reach doctors and patients online.',
  sub: 'Digital marketer with 5+ years in pharma. Open to full-time roles and consulting work.',
  proof: ['Brand strategy', 'Doctor & patient campaigns', 'Compliant content', 'Analytics'],
}

export const ABOUT = {
  tag: 'About',
  title: 'About Ashutosh',
  subtitle: INTRO.role,
  body: 'I plan and run digital campaigns for pharmaceutical brands, aimed at doctors and patients. I work with brand, medical and legal teams so every campaign is measurable and compliant.',
  skills: [
    'Brand strategy & positioning',
    'Doctor (HCP) & patient engagement',
    'Omnichannel campaign management',
    'Analytics & performance marketing',
    'Healthcare compliance',
  ],
}

export type CaseStudy = { title: string; challenge: string; approach: string; result: string; color: string }

export const WORK = {
  tag: 'Selected work',
  title: 'Campaigns',
  subtitle: 'What the brief was and what I did',
  cases: [
    {
      title: 'Pharma brand launch',
      challenge: 'Launch a new product to a crowded therapy area.',
      approach: 'Multi-channel plan across search, social, email and field-force content.',
      result: '', // TODO(Ashutosh): one real, approved result, e.g. '+32% HCP engagement'
      color: '#3a70c0',
    },
    {
      title: 'HCP marketing suite',
      challenge: 'Reach time-poor physicians with education they actually read.',
      approach: 'Segmented targeting plus short, MLR-approved education modules.',
      result: '', // TODO(Ashutosh): one real, approved result, e.g. '+32% HCP engagement'
      color: '#6a4fc9',
    },
    {
      title: 'Patient engagement strategy',
      challenge: 'Keep patients informed and on therapy.',
      approach: 'Omnichannel journeys triggered by where each patient is in treatment.',
      result: '', // TODO(Ashutosh): one real, approved result, e.g. '+32% HCP engagement'
      color: '#2d9e6f',
    },
    {
      title: 'Performance dashboard',
      challenge: 'Leadership couldn’t see which spend was working.',
      approach: 'One real-time dashboard tying channel spend to outcomes.',
      result: '', // TODO(Ashutosh): one real, approved result, e.g. '+32% HCP engagement'
      color: '#e8841a',
    },
  ] as CaseStudy[],
}

export const CONTACT = {
  tag: 'Contact',
  title: 'Let’s work together',
  subtitle: 'Open to full-time roles and consulting',
  body: 'Hiring for a pharma or healthcare marketing role, or need help with a launch? Email is the fastest way to reach me.',
}

export const PLAY = {
  tag: 'Scooter park',
  title: 'Play zone',
  subtitle: 'A little bonus',
  tips: [
    'Press E (or the scooter button) to ride',
    'Ride over the orange pads to boost',
    'Jump (Space) through all 5 stars',
    'Collect every star to unlock a pre-written intro email',
  ],
}
