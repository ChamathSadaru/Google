import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const image = formData.get('image') as File;

        if (!image) {
            return NextResponse.json({ error: 'No image provided' }, { status: 400 });
        }

        const imageFormData = new FormData();
        const arrayBuffer = await image.arrayBuffer();
        const base64Image = Buffer.from(arrayBuffer).toString('base64');

        imageFormData.append('key', '6d207e02198a847aa98d0a2a901485a5');
        imageFormData.append('source', base64Image);
        
        const uploadResponse = await fetch('https://freeimage.host/api/1/upload', {
            method: 'POST',
            body: imageFormData,
        });

        const result = await uploadResponse.json();

        if (result.status_code === 200) {
            return NextResponse.json({ url: result.image.url });
        } else {
            console.error('Image hosting service error:', result);
            return NextResponse.json({ error: result.error.message || 'Failed to upload image' }, { status: result.status_code || 500 });
        }
    } catch (error) {
        console.error('Proxy upload error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
