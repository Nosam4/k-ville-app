import GoogleAd from './GoogleAd'

function Footer({ onModalOpen }) {
  return (
    <div className="flex flex-col items-center gap-4 py-6 border-t-2 border-white/10 mt-8 text-center">
      <GoogleAd />

      {/* Fallback content if ads are blocked */}
      <div className="flex justify-center items-center gap-6 flex-wrap">
        {[
          { href: "https://www.linkedin.com/in/mtrdbd46/", icon: "fa-linkedin" },
          { href: "https://www.instagram.com/kvillegame/", icon: "fa-instagram" },
          { href: "https://www.tiktok.com/@k_ville?lang=en", icon: "fa-tiktok" }
        ].map(({ href, icon }) => (
          <a
            key={icon}
            href={href}
            className="text-blue-200 text-xl p-2 rounded hover:bg-white/10 hover:text-white transition"
            target="_blank"
            rel="noopener noreferrer"
          >
            <i className={`fa-brands ${icon}`}></i>
          </a>
        ))}

        <p
          className="text-blue-200 text-xl p-2 rounded hover:bg-white/10 hover:text-white transition cursor-pointer"
          onClick={() => onModalOpen('leaderboard')}
        >
          <i className="fa-solid fa-ranking-star"></i>
        </p>
        <p
          className="text-blue-200 text-xl p-2 rounded hover:bg-white/10 hover:text-white transition cursor-pointer"
          onClick={() => onModalOpen('signIn')}
        >
          <i className="fa-solid fa-right-to-bracket"></i>
        </p>
      </div>
    </div>
  )
}

export default Footer
