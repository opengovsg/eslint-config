export const List = ({ items }) => (
  <ul>
    {items.map((item) => (
      <li>{item}</li>
    ))}
  </ul>
)
