export type DashboardMetric = {
  label: string;
  value: string;
  helper: string;
};

export type DashboardActivity = {
  title: string;
  detail: string;
  time: string;
};

export type MockDashboardData = {
  headline: string;
  description: string;
  metrics: DashboardMetric[];
  priorities: string[];
  recentActivity: DashboardActivity[];
};

export type MockUser = {
  id: string;
  email: string;
  password: string;
  name: string;
  role: string;
  team: string;
  dashboard: MockDashboardData;
};

export type PublicMockUser = Omit<MockUser, "password">;

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

const mockUsers: MockUser[] = [
  {
    id: "user101",
    email: "ava@mergen.ai",
    password: "password123",
    name: "Ava Johnson",
    role: "Research Lead",
    team: "Consumer Insights",
    dashboard: {
      headline: "Your respondent funnel is healthy this week.",
      description: "Campus pilot responses are up 18%, and data quality has stayed above the target threshold.",
      metrics: [
        {
          label: "Active surveys",
          value: "4",
          helper: "2 close this week"
        },
        {
          label: "Qualified responses",
          value: "186",
          helper: "+18% vs last week"
        },
        {
          label: "Budget remaining",
          value: "$2,450",
          helper: "On pace for month-end"
        }
      ],
      priorities: [
        "Review the low-completion segment in Germany before Wednesday.",
        "Approve the new incentive plan for postgraduate respondents.",
        "Send the March summary deck to the education partners list."
      ],
      recentActivity: [
        {
          title: "Survey launch approved",
          detail: "Student mobility concept test was published to 3 target regions.",
          time: "10 minutes ago"
        },
        {
          title: "AI report generated",
          detail: "Market sentiment summary is ready for stakeholder review.",
          time: "2 hours ago"
        },
        {
          title: "Reward budget updated",
          detail: "Incentive pool increased by $300 for underrepresented respondents.",
          time: "Yesterday"
        }
      ]
    }
  },
  {
    id: "user202",
    email: "liam@mergen.ai",
    password: "password123",
    name: "Liam Chen",
    role: "Growth Analyst",
    team: "Partnership Expansion",
    dashboard: {
      headline: "Two target markets are ready for follow-up outreach.",
      description: "Your active campaigns in Singapore and Poland are converting well and need next-step planning.",
      metrics: [
        {
          label: "Partner leads",
          value: "27",
          helper: "5 marked hot"
        },
        {
          label: "Conversion rate",
          value: "12.8%",
          helper: "+2.1 pts this month"
        },
        {
          label: "Meetings booked",
          value: "9",
          helper: "3 scheduled this week"
        }
      ],
      priorities: [
        "Follow up with the Warsaw university consortium before Friday.",
        "Prepare a pricing comparison for the Singapore prospects.",
        "Review ad creative performance for the referral campaign."
      ],
      recentActivity: [
        {
          title: "Lead score updated",
          detail: "Three partnership prospects moved into the priority queue.",
          time: "35 minutes ago"
        },
        {
          title: "Campaign snapshot exported",
          detail: "Q1 outreach report was shared with the leadership team.",
          time: "4 hours ago"
        },
        {
          title: "Meeting confirmed",
          detail: "Intro call with EduBridge is locked for Thursday 14:00.",
          time: "Yesterday"
        }
      ]
    }
  },
  {
    id: "user303",
    email: "sofia@mergen.ai",
    password: "password123",
    name: "Sofia Patel",
    role: "Community Manager",
    team: "Member Success",
    dashboard: {
      headline: "Community engagement is trending upward.",
      description: "Weekly participation improved after the new onboarding flow, especially for first-time members.",
      metrics: [
        {
          label: "Active members",
          value: "1,248",
          helper: "+74 this week"
        },
        {
          label: "Survey completions",
          value: "412",
          helper: "91% quality pass rate"
        },
        {
          label: "Pending rewards",
          value: "63",
          helper: "14 need manual review"
        }
      ],
      priorities: [
        "Resolve the 14 reward reviews waiting in the moderation queue.",
        "Check the onboarding drop-off for mobile users in Turkey.",
        "Publish the April community spotlight and reward recap."
      ],
      recentActivity: [
        {
          title: "Reward batch processed",
          detail: "49 member payouts were approved and queued for export.",
          time: "20 minutes ago"
        },
        {
          title: "Community alert sent",
          detail: "A reminder went out for the healthcare trend survey.",
          time: "1 hour ago"
        },
        {
          title: "Onboarding copy refreshed",
          detail: "The welcome sequence was updated for new member cohorts.",
          time: "Today"
        }
      ]
    }
  }
];

export function getMockLoginUsers() {
  return mockUsers.map(({ id, email, password, name, role, team }) => ({
    id,
    email,
    password,
    name,
    role,
    team
  }));
}

export function getMockUserById(id: string): PublicMockUser | null {
  const user = mockUsers.find((entry) => entry.id === id);

  if (!user) {
    return null;
  }

  const { password: _password, ...publicUser } = user;
  return publicUser;
}

export function findMockUserByCredentials(email: string, password: string): PublicMockUser | null {
  const user = mockUsers.find(
    (entry) => normalizeEmail(entry.email) === normalizeEmail(email) && entry.password === password
  );

  if (!user) {
    return null;
  }

  const { password: _password, ...publicUser } = user;
  return publicUser;
}
