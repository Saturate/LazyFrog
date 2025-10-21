/**
 * About Tab - Version info and documentation
 */

import React from "react";
import {
  Info,
  Rocket,
  Link as LinkIcon,
  AlertTriangle,
  Github,
} from "lucide-react";

// Version info injected by webpack
declare const __VERSION__: string;
declare const __BUILD_TIME__: string;

const AboutTab: React.FC = () => {
  const buildDate = new Date(__BUILD_TIME__);
  const now = new Date();
  const hoursAgo = Math.floor(
    (now.getTime() - buildDate.getTime()) / (1000 * 60 * 60)
  );

  return (
    <div>
      <div className="card">
        <h2>
          <Info
            size={20}
            style={{
              display: "inline-block",
              marginRight: "8px",
              verticalAlign: "middle",
            }}
          />
          About AutoSupper
        </h2>
        <div style={{ marginBottom: "24px" }}>
          <div
            style={{ fontSize: "14px", color: "#a1a1aa", marginBottom: "8px" }}
          >
            Version:{" "}
            <span style={{ color: "#e5e5e5", fontWeight: "500" }}>
              {__VERSION__}
            </span>
          </div>
          <div style={{ fontSize: "14px", color: "#a1a1aa" }}>
            Build:{" "}
            <span style={{ color: "#e5e5e5", fontWeight: "500" }}>
              {hoursAgo < 1
                ? "Less than 1 hour ago"
                : `${hoursAgo} hour${hoursAgo > 1 ? "s" : ""} ago`}
            </span>
          </div>
        </div>
      </div>

      <div className="card">
        <h2>
          <Rocket
            size={20}
            style={{
              display: "inline-block",
              marginRight: "8px",
              verticalAlign: "middle",
            }}
          />
          Quick Start
        </h2>
        <ol
          style={{ color: "#a1a1aa", lineHeight: "1.8", paddingLeft: "20px" }}
        >
          <li>
            Configure mission filters in the{" "}
            <strong style={{ color: "#3b82f6" }}>Automation</strong> tab
          </li>
          <li>
            Adjust automation settings in the{" "}
            <strong style={{ color: "#3b82f6" }}>Settings</strong> tab
          </li>
          <li>Visit a Sword & Supper post on Reddit</li>
          <li>
            Click the <strong style={{ color: "#22c55e" }}>START</strong> button
            in the control panel
          </li>
          <li>The bot will automatically find and complete missions</li>
        </ol>
      </div>

      <div className="card">
        <h2>
          <LinkIcon
            size={20}
            style={{
              display: "inline-block",
              marginRight: "8px",
              verticalAlign: "middle",
            }}
          />
          Links
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {/* TODO: Add donation link when ready from github */}
          <a
            href="#"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: "#3b82f6",
              textDecoration: "none",
              fontSize: "14px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            Donate
          </a>
          <a
            href="https://www.reddit.com/r/SwordAndSupper/"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: "#3b82f6",
              textDecoration: "none",
              fontSize: "14px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            Sword & Supper Community
          </a>
        </div>
      </div>

      <div className="card">
        <h2>
          <AlertTriangle
            size={20}
            style={{
              display: "inline-block",
              marginRight: "8px",
              verticalAlign: "middle",
            }}
          />
          Disclaimer
        </h2>
        <p style={{ color: "#a1a1aa", fontSize: "14px", lineHeight: "1.6" }}>
          This is an automation tool for educational purposes. Use responsibly
          and in accordance with Reddit's Terms of Service. The developers are
          not responsible for any consequences of using this tool.
        </p>
      </div>

      <div className="card">
        <h2>
          <Info
            size={20}
            style={{
              display: "inline-block",
              marginRight: "8px",
              verticalAlign: "middle",
            }}
          />
          Credits
        </h2>

        <p style={{ color: "#a1a1aa", fontSize: "14px", lineHeight: "1.6" }}>
          Created by{" "}
          <span style={{ color: "#3b82f6" }}>Allan Kimmer Jensen</span>
        </p>

        <p style={{ color: "#a1a1aa", fontSize: "14px", lineHeight: "1.6" }}>
          Reddit: <strong style={{ color: "#22c55e" }}>u/AKJ90</strong>
        </p>

        <p style={{ color: "#a1a1aa", fontSize: "14px", lineHeight: "1.6" }}>
          <Github size={16} style={{ opacity: 0.9 }} /> GitHub:{" "}
          <a
            href="https://github.com/Saturate"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: "#a855f7",
              textDecoration: "none",
              fontWeight: 500,
            }}
          >
            @Saturate
          </a>
        </p>
      </div>
    </div>
  );
};

export default AboutTab;
