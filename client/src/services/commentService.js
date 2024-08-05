import * as request from '../lib/request';

const baseUrl = 'http://localhost:3030/data/comments';

export const getAllApplianceComments = async (applianceId) => {
    const query = new URLSearchParams({
        where: `applianceId="${applianceId}"`
    });

    try {
        const result = await request.get(`${baseUrl}?${query}`);
        return result;
    } catch (error) {
        console.log(error.message);
        throw error;
    };
}

export const createComment = async (applianceId, username, text, replyToId) => {

    if (replyToId) {
        const newComment = await request.post(baseUrl, {
            applianceId,
            username,
            text,
            replyToId
        });

        return newComment;
    } else {
        const newComment = await request.post(baseUrl, {
            applianceId,
            username,
            text
        });

        return newComment;
    }
}

export const deleteComment = async (commentId) => {
    await request.remove(`${baseUrl}/${commentId}`);
}