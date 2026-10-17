type BaseInputProps = {
    label: string;
    value: string;
    onChange: (value: string) => void;
};
const Input = ({ label, value, onChange }: BaseInputProps) => {
    return (
        <div className="mx-auto">
            <label className="block mb-2 font-medium">
                {label}
            </label>
            <input
                type="text"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={`Enter your ${label.toLowerCase()}`}
                className="w-full border border-gray-300 dark:border-neutral-700 rounded-2xl px-4 py-3 bg-gray-100 dark:bg-dark-raised outline-none focus:border-red-500 focus:bg-gray-50 dark:focus:bg-dark-raised transition-colors duration-200"
            />
        </div>
    );
};

export default Input;

