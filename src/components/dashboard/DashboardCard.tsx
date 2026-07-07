const recentCandidates = [
    {
      name: "Rahul Sharma",
      role: "Frontend Developer",
      score: "94%",
    },
    {
      name: "Priya Patel",
      role: "Backend Developer",
      score: "91%",
    },
    {
      name: "Arjun Kumar",
      role: "Data Analyst",
      score: "88%",
    },
  ];
  
  export default function DashboardCard() {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-semibold">
            Recent Candidates
          </h2>
  
          <button className="text-sm font-medium text-indigo-600 hover:underline">
            View All
          </button>
        </div>
  
        <div className="space-y-4">
          {recentCandidates.map((candidate) => (
            <div
              key={candidate.name}
              className="flex items-center justify-between rounded-xl border border-gray-100 p-4"
            >
              <div>
                <h3 className="font-semibold text-gray-900">
                  {candidate.name}
                </h3>
  
                <p className="text-sm text-gray-500">
                  {candidate.role}
                </p>
              </div>
  
              <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-semibold text-green-700">
                {candidate.score}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }