import os

IGNORE = {
    "node_modules",
    ".git",
    "dist",
    "__pycache__",
    ".venv",
    ".next",
}

def generate_tree(path, prefix=""):
    lines = []

    items = [
        item for item in os.listdir(path)
        if item not in IGNORE
    ]
    items.sort()

    for i, item in enumerate(items):
        full_path = os.path.join(path, item)
        last = i == len(items) - 1

        connector = "└── " if last else "├── "

        if os.path.isdir(full_path):
            lines.append(f"{prefix}{connector}{item}/")

            new_prefix = prefix + ("    " if last else "│   ")
            lines.extend(generate_tree(full_path, new_prefix))
        else:
            lines.append(f"{prefix}{connector}{item}")

    return lines


tree = generate_tree(".")

with open("FILE_TREE.md", "w", encoding="utf-8") as f:
    f.write("# Project File Structure\n\n")
    f.write("```text\n")
    f.write("\n".join(tree))
    f.write("\n```\n")

print("FILE_TREE.md created successfully!")