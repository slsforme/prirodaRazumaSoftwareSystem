export const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const options: Intl.DateTimeFormatOptions = {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    };
    return new Intl.DateTimeFormat('ru-RU', options).format(date);
};

export const formatAge = (age: number) => {
    if (age === 1) return `${age} год`;
    else if (age > 1 && age < 5) return `${age} года`;
    else if (age >= 5) return `${age} лет`;
}