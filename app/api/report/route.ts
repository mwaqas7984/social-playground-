import { NextRequest, NextResponse } from 'next/server';
import { ReportData } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const reportData: ReportData = await request.json();
    
    // Log the report (in production, you'd save this to a database)
    console.log('Report received:', {
      reporterId: reportData.reporterId,
      roomId: reportData.roomId,
      reason: reportData.reason,
      timestamp: new Date(reportData.timestamp).toISOString()
    });
    
    // TODO: In production, you would:
    // 1. Save to database
    // 2. Send notification to moderators
    // 3. Potentially auto-ban if multiple reports
    
    return NextResponse.json({ 
      success: true, 
      message: 'Report submitted successfully' 
    });
  } catch (error) {
    console.error('Error processing report:', error);
    
    return NextResponse.json({ 
      success: false, 
      message: 'Failed to submit report' 
    }, { status: 500 });
  }
}
