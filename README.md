# LLM-Deployer
# LLM Project

This project provides a local environment to experiment with LLM-based tasks. It includes a Node.js backend, Python scripts for processing and evaluation, and sample data.

---

## Project Structure

```
.
├── server.js             # Node.js backend server
├── evaluation.py         # Evaluation script
├── round1.py             # Round 1 processing
├── round2.py             # Round 2 processing
├── scripts/              # Additional helper scripts
├── package.json          # Node.js dependencies
├── requirements.txt      # Python dependencies
├── .env                  # Environment variables (ignored)
├── .env.example          # Example environment variables
├── sample_submissions.csv# Sample data
└── .gitignore
```

---

## Setup Instructions

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd llm
```

### 2. Install Node.js Dependencies

```bash
npm install
```

### 3. Install Python Dependencies

```bash
cat requirements.txt
```
download all the requirements.txt

### 4. Configure Environment Variables

Copy the example `.env` file and update your variables:

```bash
cp .env.example .env
```

---

## Running the Project

### Node.js Server

```bash
node server.js
```

The server will run on `http://localhost:3000`.

### Python Scripts

Run the Python scripts as needed:

```bash
python evaluation.py
python round1.py
python round2.py
```

---

## Docker Setup (Optional)

### Build Docker Image

```bash
docker build -t llm-project .
```

### Run Docker Container

```bash
docker run -p 3000:3000 llm-project
```

---

## Git Notes

- `.env` is ignored by Git to prevent committing secrets.  
- Commit `.env.example` as a template.

---

## Contributing

Feel free to open issues or pull requests. Ensure no secrets are committed.

---

## License

This project is licensed under [MIT License](LICENSE).
