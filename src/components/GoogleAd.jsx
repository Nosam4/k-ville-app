import { useEffect, useRef, useState } from 'react'

function GoogleAd() {
  const adRef = useRef(null)
  const [adBlocked, setAdBlocked] = useState(false)

  useEffect(() => {
    const tryAd = () => {
      if (!window.adsbygoogle || !adRef.current) return
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({})
        setTimeout(() => {
          // Check if the ad is empty
          const adHeight = adRef.current.offsetHeight
          if (adHeight === 0) setAdBlocked(true)
        }, 1000)
      } catch {
        setAdBlocked(true)
      }
    }

    tryAd()
  }, [])

  if (adBlocked) return null

  return (
    <ins
      className="adsbygoogle block w-full my-4"
      style={{ display: 'block' }}
      data-ad-client="ca-pub-3727662330495040"
      data-ad-slot="2608955618"
      data-ad-format="auto"
      data-full-width-responsive="true"
      ref={adRef}
    ></ins>
  )
}

export default GoogleAd
