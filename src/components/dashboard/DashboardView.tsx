import WelcomeCard from "./WelcomeCard";
import StatsCard from "./StatsCard";
import AnalyticsChart from "./AnalyticsChart";
import DashboardCard from "./DashboardCard";
import ActivityCard from "./ActivityCard";
import { Users, Brain, Target, Briefcase } from "lucide-react";

export default function DashboardView() {
  return (
    <div className="space-y-8">
      <WelcomeCard />

      <section className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        <StatsCard
          title="Total Candidates"
          value="1,248"
          change="+12%"
          subtitle="Active Talent Pool"
          icon={<Users size={24} />}
        />

        <StatsCard
          title="AI Matches"
          value="563"
          change="+18%"
          subtitle="Recommended Profiles"
          icon={<Brain size={24} />}
        />

        <StatsCard
          title="ATS Score"
          value="92%"
          change="+5%"
          subtitle="Average Resume Quality"
          icon={<Target size={24} />}
        />

        <StatsCard
          title="Placements"
          value="38"
          change="+11%"
          subtitle="Successful Hires"
          icon={<Briefcase size={24} />}
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <AnalyticsChart />
        </div>

        <ActivityCard />
      </section>

      <DashboardCard />
    </div>
  );
}
