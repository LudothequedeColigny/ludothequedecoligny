export default function TitrePactes({ className = '' }) {
  const letters = [
    { char: 'P', color: '#12653C' },
    { char: 'A', color: '#2762A1' },
    { char: 'C', color: '#E75A19' },
    { char: 'T', color: '#772D87' },
    { char: 'E', color: '#AC1B59' },
    { char: 'S', color: '#CD1A1E' },
  ]
  return (
    <span className={`font-extrabold ${className}`} style={{ fontFamily: 'Poppins, sans-serif' }}>
      {letters.map(({ char, color }) => (
        <span key={char} style={{ color }}>{char}</span>
      ))}
    </span>
  )
}
