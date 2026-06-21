import { useEffect } from 'react'

function Modal({ isOpen, onClose, title, children }) {
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose()
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/80 flex justify-center items-center z-[2000]" onClick={onClose}>
      <div
        className="bg-gradient-to-br from-[#001a57] to-[#003d82] p-10 rounded-2xl max-w-xl w-[90%] max-h-[80vh] overflow-y-auto border-2 border-white/20 shadow-2xl relative"
        onClick={(e) => e.stopPropagation()}
      >
        <span
          className="absolute top-4 right-5 text-3xl text-blue-200 hover:text-white cursor-pointer transition"
          onClick={onClose}
        >
          &times;
        </span>
        <h2 className="text-white text-2xl font-bold mb-4 text-center">{title}</h2>
        {children}
      </div>
    </div>
  )
}

export default Modal
