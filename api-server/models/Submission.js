import mongoose from 'mongoose';

const submissionSchema = new mongoose.Schema({
    userId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    language: { 
        type: String, 
        required: true 
    },
    code: { 
        type: String, 
        required: true 
    },
    input: { 
        type: String, 
        default: '' 
    },
    status: { 
        type: String, 
        required: true,
        enum: ['Queued', 'Processing', 'Success', 'Error', 'Time Limit Exceeded'],
        default: 'Queued'
    },
    output: { 
        type: String 
    },
    executionTime: { 
        type: Number 
    },
    createdAt: { 
        type: Date, 
        default: Date.now 
    }
});

export default mongoose.model('Submission', submissionSchema);