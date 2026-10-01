export const VisaIcon = () => (
  <svg className="co-pay-icon" viewBox="0 0 38 24" role="img" aria-label="Visa">
    <rect width="38" height="24" rx="3" fill="#1434cb" />
    <text x="19" y="16" textAnchor="middle" fill="#fff" fontSize="10" fontWeight="700" fontStyle="italic" fontFamily="Arial, sans-serif">
      VISA
    </text>
  </svg>
);

export const MastercardIcon = () => (
  <svg className="co-pay-icon" viewBox="0 0 38 24" role="img" aria-label="Mastercard">
    <rect width="38" height="24" rx="3" fill="#252525" />
    <circle cx="15" cy="12" r="7" fill="#eb001b" />
    <circle cx="23" cy="12" r="7" fill="#f79e1b" />
    <path d="M19 6.5a7 7 0 0 1 0 11 7 7 0 0 1 0-11z" fill="#ff5f00" />
  </svg>
);
