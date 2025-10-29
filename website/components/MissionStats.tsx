"use client";

import dynamic from "next/dynamic";
import {
  MissionRecord,
  ENVIRONMENT_LABELS,
  Environment,
} from "@lazyfrog/types";
import type { ApexOptions } from "apexcharts";

// Dynamically import ReactApexChart to avoid SSR issues
const ReactApexChart = dynamic(() => import("react-apexcharts"), {
  ssr: false,
});

interface MissionStatsProps {
  missions: MissionRecord[];
  isLoading: boolean;
}

export function MissionStats({ missions, isLoading }: MissionStatsProps) {
  if (isLoading) {
    return (
      <div className="mb-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="bg-white dark:bg-zinc-800 rounded-xl shadow-lg p-6 animate-pulse"
            >
              <div className="h-4 bg-gray-200 dark:bg-zinc-700 rounded w-3/4 mb-4"></div>
              <div className="h-8 bg-gray-200 dark:bg-zinc-700 rounded w-1/2"></div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(2)].map((_, i) => (
            <div
              key={i}
              className="bg-white dark:bg-zinc-800 rounded-xl shadow-lg p-6 animate-pulse"
            >
              <div className="h-6 bg-gray-200 dark:bg-zinc-700 rounded w-1/2 mb-4"></div>
              <div className="h-64 bg-gray-200 dark:bg-zinc-700 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Calculate stats
  const totalMissions = missions.length;

  const byEnvironment = missions.reduce((acc, mission) => {
    acc[mission.environment] = (acc[mission.environment] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const byDifficulty = missions.reduce((acc, mission) => {
    acc[mission.difficulty] = (acc[mission.difficulty] || 0) + 1;
    return acc;
  }, {} as Record<number, number>);

  const lastUpdated =
    missions.length > 0
      ? new Date(
          Math.max(...missions.map((m) => m.timestamp))
        ).toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
        })
      : "N/A";

  const avgDifficulty =
    missions.length > 0
      ? (
          missions.reduce((sum, m) => sum + m.difficulty, 0) / missions.length
        ).toFixed(1)
      : "0";

  // Environment colors
  const environmentColors: Record<Environment, string> = {
    haunted_forest: "#8b5cf6",
    new_eden: "#10b981",
    wild_west: "#f59e0b",
    jungle: "#22c55e",
    desert: "#eab308",
    tundra: "#06b6d4",
    underwater: "#3b82f6",
    mountains: "#6366f1",
  };

  // Prepare environment chart data
  const environmentEntries = Object.entries(byEnvironment).sort(
    (a, b) => b[1] - a[1]
  );
  const environmentSeries = environmentEntries.map(([_, count]) => count);
  const environmentLabels = environmentEntries.map(
    ([env]) => ENVIRONMENT_LABELS[env as Environment]
  );
  const environmentChartColors = environmentEntries.map(
    ([env]) => environmentColors[env as Environment]
  );

  const environmentOptions: ApexOptions = {
    chart: {
      type: "donut",
      background: "transparent",
      fontFamily: "inherit",
    },
    labels: environmentLabels,
    colors: environmentChartColors,
    legend: {
      position: "right",
      fontSize: "13px",
      fontWeight: 500,
      offsetY: 0,
      height: 230,
    },
    plotOptions: {
      pie: {
        donut: {
          size: "70%",
          labels: {
            show: true,
            name: {
              show: true,
              fontSize: "16px",
              fontWeight: 600,
              offsetY: -10,
            },
            value: {
              show: true,
              fontSize: "28px",
              fontWeight: "bold",
              offsetY: 10,
              formatter: (val) => val.toString(),
            },
            total: {
              show: true,
              label: "Total Missions",
              fontSize: "14px",
              fontWeight: "normal",
              color: "#6b7280",
              formatter: () => totalMissions.toLocaleString(),
            },
          },
        },
      },
    },
    dataLabels: {
      enabled: false,
    },
    stroke: {
      width: 2,
      colors: ["#fff"],
    },
    states: {
      hover: {
        filter: {
          type: "lighten",
          value: 0.15,
        },
      },
    },
    tooltip: {
      y: {
        formatter: (val) =>
          `${val} missions (${((val / totalMissions) * 100).toFixed(1)}%)`,
      },
    },
  };

  // Prepare difficulty chart data
  const difficultyEntries = Object.entries(byDifficulty).sort(
    (a, b) => parseInt(a[0]) - parseInt(b[0])
  );
  const difficultySeries = difficultyEntries.map(([_, count]) => count);
  const difficultyLabels = difficultyEntries.map(([diff]) => {
    const stars = "⭐".repeat(parseInt(diff));
    return `${stars}`;
  });
  const difficultyColors = [
    "#ef4444",
    "#f97316",
    "#f59e0b",
    "#eab308",
    "#22c55e",
  ];

  const difficultyOptions: ApexOptions = {
    chart: {
      type: "donut",
      background: "transparent",
      fontFamily: "inherit",
    },
    labels: difficultyLabels,
    colors: difficultyColors,
    legend: {
      position: "right",
      fontSize: "13px",
      fontWeight: 500,
      offsetY: 0,
      height: 200,
      formatter: (seriesName, opts) => {
        const val = opts.w.globals.series[opts.seriesIndex];
        const stars = seriesName;
        const starCount = opts.seriesIndex + 1;
        return `${stars} (${starCount} star${
          starCount > 1 ? "s" : ""
        }) - ${val}`;
      },
    },
    plotOptions: {
      pie: {
        donut: {
          size: "50%",
          labels: {
            show: true,
            name: {
              show: true,
              fontSize: "16px",
              fontWeight: 600,
              offsetY: -10,
            },
            value: {
              show: true,
              fontSize: "28px",
              fontWeight: "bold",
              offsetY: 10,
              formatter: (val) => val.toString(),
            },
            total: {
              show: false,
              label: "Total Missions",
              fontSize: "14px",
              fontWeight: "normal",
              color: "#6b7280",
              formatter: () => totalMissions.toLocaleString(),
            },
          },
        },
      },
    },
    dataLabels: {
      enabled: false,
    },
    stroke: {
      width: 2,
      colors: ["#fff"],
    },
    states: {
      hover: {
        filter: {
          type: "lighten",
          value: 0.15,
        },
      },
    },
    tooltip: {
      y: {
        formatter: (val) =>
          `${val} missions (${((val / totalMissions) * 100).toFixed(1)}%)`,
      },
    },
  };

  return (
    <div className="mb-6">
      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        {/* Total Missions */}
        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg shadow-md p-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-emerald-100 text-xs font-medium mb-0.5">
                Total Missions
              </p>
              <p className="text-2xl font-bold">
                {totalMissions.toLocaleString()}
              </p>
            </div>
            <div className="bg-white/20 rounded-full p-2">
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Average Difficulty */}
        <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-lg shadow-md p-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-amber-100 text-xs font-medium mb-0.5">
                Average Difficulty
              </p>
              <p className="text-xl font-bold">
                {"⭐".repeat(Math.round(parseFloat(avgDifficulty)))}
              </p>
              <p className="text-amber-100 text-xs mt-0.5">
                {avgDifficulty} / 5.0
              </p>
            </div>
            <div className="bg-white/20 rounded-full p-2">
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Last Updated */}
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-md p-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-xs font-medium mb-0.5">
                Last Updated
              </p>
              <p className="text-lg font-bold">{lastUpdated}</p>
              <p className="text-blue-100 text-xs mt-0.5">
                {Object.keys(byEnvironment).length} environments
              </p>
            </div>
            <div className="bg-white/20 rounded-full p-2">
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Environment Distribution */}
        <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-md p-4">
          <h3 className="text-base font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <span className="w-1 h-5 bg-emerald-500 rounded-full"></span>
            Environment Distribution
          </h3>
          <ReactApexChart
            options={environmentOptions}
            series={environmentSeries}
            type="donut"
            height={240}
          />
        </div>

        {/* Difficulty Distribution */}
        <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-md p-4">
          <h3 className="text-base font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <span className="w-1 h-5 bg-amber-500 rounded-full"></span>
            Difficulty Distribution
          </h3>
          <ReactApexChart
            options={difficultyOptions}
            series={difficultySeries}
            type="donut"
            height={240}
          />
        </div>
      </div>
    </div>
  );
}
